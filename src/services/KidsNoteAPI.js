import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import axios from 'axios';
import CookieManager from '@react-native-cookies/cookies';

const BASE_URL = 'https://www.kidsnote.com';
const API_BASE = '/api/v1_2';

class KidsNoteAPI {
  constructor() {
    this.sessionID = null;
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    try {
      console.log('Making request to:', url);
      
      // CookieManager에서 쿠키 가져오기
      const cookies = await CookieManager.get(BASE_URL);
      console.log('🍪 요청에 사용할 쿠키:', cookies);
      
      const config = {
        method: options.method || 'GET',
        url: endpoint,
        headers: {
          ...options.headers,
        },
        ...options,
      };

      // sessionid 쿠키 설정 (우선순위: CookieManager > this.sessionID)
      if (cookies.sessionid) {
        config.headers.Cookie = `sessionid=${cookies.sessionid.value}`;
        this.sessionID = cookies.sessionid.value; // 동기화
      } else if (this.sessionID) {
        config.headers.Cookie = `sessionid=${this.sessionID}`;
      }

      const response = await this.axiosInstance(config);
      console.log('Response status:', response.status);
      
      return { response, data: response.data };
    } catch (error) {
      console.error('Request error:', error);
      if (error.response?.status === 401) {
        throw new Error('세션 만료! 다시 로그인해주세요.');
      } else if (error.response?.status === 403) {
        throw new Error('접근 권한이 없습니다. 로그인을 확인해주세요.');
      } else if (error.response?.status >= 400) {
        throw new Error(`HTTP ${error.response.status}: 서버 오류가 발생했습니다.`);
      }
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('네트워크 연결을 확인해주세요.');
      }
      throw error;
    }
  }

  async login(username, password) {
    console.log('🔐 로그인 시작:', username);
    
    try {
      // 쿠키 초기화
      await CookieManager.clearAll();
      
      // 1단계: 로그인 페이지에서 CSRF 토큰 가져오기
      console.log('📋 1단계: 로그인 페이지에서 CSRF 토큰 가져오기...');
      
      const loginPageResponse = await this.axiosInstance.get('/kr/login/', {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      
      console.log('📋 로그인 페이지 응답 상태:', loginPageResponse.status);
      console.log('📋 로그인 페이지 HTML 길이:', loginPageResponse.data.length);
      
      // CSRF 토큰 추출 (다양한 패턴 시도)
      const csrfPatterns = [
        /name='csrfmiddlewaretoken' value='([^']*)'/,
        /name="csrfmiddlewaretoken" value="([^"]*)"/,
        /csrfmiddlewaretoken.*?value="([^"]*)"/,
        /csrfmiddlewaretoken.*?value='([^']*)'/,
        /<input[^>]*name=["']csrfmiddlewaretoken["'][^>]*value=["']([^"']*)/,
        /<meta[^>]*name=["']csrf-token["'][^>]*content=["']([^"']*)/i,
        /csrf[_-]?token['"]\s*:\s*['"]([^'"]*)/i,
        /window\._token\s*=\s*['"]([^'"]*)/i,
      ];
      
      let csrfToken = '';
      for (const pattern of csrfPatterns) {
        const match = loginPageResponse.data.match(pattern);
        if (match) {
          csrfToken = match[1];
          console.log('✅ CSRF 토큰 찾음:', csrfToken.substring(0, 10) + '...');
          break;
        }
      }
      
      if (!csrfToken) {
        console.log('❌ CSRF 토큰을 찾을 수 없음');
        console.log('📄 로그인 페이지 미리보기:', loginPageResponse.data.substring(0, 2000));
      }

      // 2단계: 실제 로그인 요청
      console.log('🔑 2단계: 로그인 요청...');
      
      const bodyParams = new URLSearchParams();
      bodyParams.append('username', username);
      bodyParams.append('password', password);
      if (csrfToken) {
        bodyParams.append('csrfmiddlewaretoken', csrfToken);
      }
      
      console.log('📝 로그인 데이터:', { username, hasPassword: !!password, hasCsrf: !!csrfToken });

      const loginResponse = await this.axiosInstance.post('/kr/login/', bodyParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': `${BASE_URL}/kr/login/`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        maxRedirects: 0, // 리다이렉트 수동 처리
        validateStatus: function (status) {
          return status >= 200 && status < 400; // 3xx도 성공으로 처리
        },
      });

      console.log('🔑 로그인 응답 상태:', loginResponse.status);
      console.log('🔑 로그인 응답 헤더:', loginResponse.headers);

      // CookieManager에서 쿠키 확인
      const cookies = await CookieManager.get(BASE_URL);
      console.log('🍪 CookieManager에서 가져온 쿠키:', cookies);
      
      if (cookies.sessionid) {
        this.sessionID = cookies.sessionid.value;
        await AsyncStorage.setItem('kidsnote_session', this.sessionID);
        console.log('✅ 로그인 성공! 세션 ID:', this.sessionID);
        return { success: true, sessionID: this.sessionID };
      }
      
      // 응답 헤더에서도 확인 (백업)
      const setCookieHeader = loginResponse.headers['set-cookie'];
      console.log('🍪 응답 헤더에서 가져온 쿠키 (백업):', setCookieHeader);
      
      if (setCookieHeader) {
        const sessionMatch = setCookieHeader.find(cookie => cookie.includes('sessionid='));
        if (sessionMatch) {
          const sessionId = sessionMatch.match(/sessionid=([^;]*)/)?.[1];
          if (sessionId) {
            this.sessionID = sessionId;
            await AsyncStorage.setItem('kidsnote_session', this.sessionID);
            console.log('✅ 로그인 성공! (헤더에서) 세션 ID:', this.sessionID);
            return { success: true, sessionID: this.sessionID };
          }
        }
      }

      // 응답 본문 확인 (디버깅용)
      console.log('📄 로그인 응답 본문 길이:', loginResponse.data.length);
      console.log('📄 로그인 응답 미리보기:', loginResponse.data.substring(0, 1000));
      
      // 로그인 실패 원인 분석
      if (loginResponse.data.includes('잘못된') || loginResponse.data.includes('invalid') || loginResponse.data.includes('incorrect')) {
        console.log('🚫 로그인 실패: 잘못된 자격 증명');
        return { success: false, error: '아이디 또는 비밀번호가 잘못되었습니다.' };
      }
      
      if (loginResponse.data.includes('csrf') || loginResponse.data.includes('CSRF')) {
        console.log('🚫 로그인 실패: CSRF 토큰 문제');
        return { success: false, error: 'CSRF 토큰 오류입니다. 다시 시도해주세요.' };
      }
      
      if (loginResponse.data.includes('<form') && loginResponse.data.includes('login')) {
        console.log('🚫 로그인 실패: 로그인 폼이 다시 표시됨');
        return { success: false, error: '로그인에 실패했습니다. 자격 증명을 확인해주세요.' };
      }

      // 리다이렉트 확인
      if (loginResponse.status === 302 || loginResponse.status === 301) {
        console.log('🔄 리다이렉트 감지됨 - 로그인 성공 가능성');
        // CookieManager에서 쿠키 다시 확인
        const redirectCookies = await CookieManager.get(BASE_URL);
        if (redirectCookies.sessionid) {
          this.sessionID = redirectCookies.sessionid.value;
          await AsyncStorage.setItem('kidsnote_session', this.sessionID);
          console.log('✅ 리다이렉트 후 로그인 성공! 세션 ID:', this.sessionID);
          return { success: true, sessionID: this.sessionID };
        }
      }

      console.log('❌ 로그인 실패: 세션 쿠키를 찾을 수 없음');
      return { success: false, error: '로그인 실패: 아이디 또는 비밀번호가 올바르지 않습니다.' };
    } catch (error) {
      console.error('💥 로그인 에러:', error);
      return { success: false, error: error.message };
    }
  }

  async saveSession(sessionID) {
    try {
      this.sessionID = sessionID;
      await AsyncStorage.setItem('kidsnote_session', sessionID);
      console.log('✅ 세션 저장 완료:', sessionID);
      return true;
    } catch (error) {
      console.error('Save session error:', error);
      return false;
    }
  }

  async loadSession() {
    try {
      this.sessionID = await AsyncStorage.getItem('kidsnote_session');
      return this.sessionID;
    } catch (error) {
      console.error('Load session error:', error);
      return null;
    }
  }

  async logout() {
    try {
      this.sessionID = null;
      await AsyncStorage.removeItem('kidsnote_session');
      await CookieManager.clearAll();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getChildren() {
    try {
      const { data } = await this.makeRequest(`${API_BASE}/me/info`);
      
      if (data.children && Array.isArray(data.children)) {
        return {
          success: true,
          children: data.children.map((child, index) => ({
            id: child.id,
            name: child.name,
            index: index + 1,
          })),
        };
      }

      return { success: false, error: '등록된 자녀가 없습니다.' };
    } catch (error) {
      console.error('Get children error:', error);
      return { success: false, error: error.message };
    }
  }

  async getReports(childId, pageSize = 20, page = 1) {
    try {
      const endpoint = `${API_BASE}/children/${childId}/reports/?page_size=${pageSize}&page=${page}&tz=Asia%2FSeoul&child=${childId}`;
      const { data } = await this.makeRequest(endpoint);
      return { success: true, data };
    } catch (error) {
      console.error('Get reports error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAlbums(childId, pageSize = 20, page = 1) {
    try {
      const endpoint = `${API_BASE}/children/${childId}/albums/?page_size=${pageSize}&page=${page}&tz=Asia%2FSeoul&child=${childId}`;
      const { data } = await this.makeRequest(endpoint);
      return { success: true, data };
    } catch (error) {
      console.error('Get albums error:', error);
      return { success: false, error: error.message };
    }
  }

  async downloadFile(url, destinationPath, onProgress) {
    try {
      const downloadDest = `${RNFS.DocumentDirectoryPath}/${destinationPath}`;
      const dirPath = downloadDest.substring(0, downloadDest.lastIndexOf('/'));
      
      await RNFS.mkdir(dirPath);

      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadDest,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        progress: (res) => {
          if (onProgress) {
            const progress = (res.bytesWritten / res.contentLength) * 100;
            onProgress(progress);
          }
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        return { success: true, path: downloadDest };
      } else {
        throw new Error(`다운로드 실패: HTTP ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('Download file error:', error);
      return { success: false, error: error.message };
    }
  }

  formatDate(dateString) {
    if (!dateString) return 'unknown_date';
    return dateString.replace(/-/g, '년') + '일';
  }

  getFileExtension(filename) {
    return filename.substring(filename.lastIndexOf('.'));
  }

  isDateInRange(date, startDate, endDate) {
    if (!startDate && !endDate) return true;
    
    const entryDate = new Date(date);
    if (isNaN(entryDate.getTime())) return true;
    
    if (startDate && endDate) {
      return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
    } else if (startDate) {
      return entryDate >= new Date(startDate);
    } else if (endDate) {
      return entryDate <= new Date(endDate);
    }
    
    return true;
  }
}

export default new KidsNoteAPI();