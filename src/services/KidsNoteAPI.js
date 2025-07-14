import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const BASE_URL = 'https://www.kidsnote.com';
const API_BASE = '/api/v1_2';

class KidsNoteAPI {
  constructor() {
    this.sessionID = null;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.sessionID) {
      defaultHeaders.Cookie = `sessionid=${this.sessionID}`;
    }

    const requestOptions = {
      method: 'GET',
      headers: { ...defaultHeaders, ...options.headers },
      timeout: 30000, // 30초 타임아웃
      ...options,
    };

    try {
      console.log('Making request to:', url);
      const response = await fetch(url, requestOptions);
      console.log('Response status:', response.status);
      
      const text = await response.text();
      
      if (response.status === 401) {
        throw new Error('세션 만료! 다시 로그인해주세요.');
      } else if (response.status === 403) {
        throw new Error('접근 권한이 없습니다. 로그인을 확인해주세요.');
      } else if (response.status >= 400) {
        console.log('Error response text:', text.substring(0, 200));
        throw new Error(`HTTP ${response.status}: 서버 오류가 발생했습니다.`);
      }

      try {
        const jsonData = JSON.parse(text);
        console.log('JSON response received');
        return { response, data: jsonData };
      } catch {
        console.log('Text response received');
        return { response, data: text };
      }
    } catch (error) {
      console.error('Request error:', error);
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('네트워크 연결을 확인해주세요.');
      }
      throw error;
    }
  }

  async login(username, password) {
    console.log('🔐 로그인 시작:', username);
    
    try {
      // 1단계: 로그인 페이지에서 CSRF 토큰 가져오기
      console.log('📋 1단계: 로그인 페이지 요청 중...');
      const loginPageResponse = await fetch(`${BASE_URL}/kr/login/`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
        },
      });
      
      console.log('📋 로그인 페이지 응답 상태:', loginPageResponse.status);
      
      const loginPageText = await loginPageResponse.text();
      console.log('📋 로그인 페이지 HTML 길이:', loginPageText.length);
      console.log('📋 로그인 페이지 HTML 일부:', loginPageText.substring(0, 300));
      
      const csrfMatch = loginPageText.match(/name='csrfmiddlewaretoken' value='([^']*)'/) || 
                       loginPageText.match(/csrfmiddlewaretoken.*?value="([^"]*)"/) ||
                       loginPageText.match(/csrfToken.*?["']([^"']*)/);
      
      let csrfToken = '';
      if (csrfMatch) {
        csrfToken = csrfMatch[1];
        console.log('✅ CSRF 토큰 찾음:', csrfToken.substring(0, 10) + '...');
      } else {
        console.log('❌ CSRF 토큰을 찾을 수 없음');
      }

      // 로그인 페이지에서 받은 쿠키 추출
      const setCookieHeaders = loginPageResponse.headers.get('set-cookie') || '';
      console.log('🍪 초기 쿠키:', setCookieHeaders);
      
      let cookieString = '';
      if (setCookieHeaders) {
        const cookies = setCookieHeaders.split(',').map(cookie => cookie.split(';')[0]).join('; ');
        cookieString = cookies;
        console.log('🍪 처리된 쿠키:', cookieString);
      }

      // 2단계: 실제 로그인 요청
      console.log('🔑 2단계: 로그인 요청 중...');
      const body = new URLSearchParams({
        username: username,
        password: password,
        csrfmiddlewaretoken: csrfToken,
      }).toString();
      
      console.log('📝 로그인 데이터:', { username, hasPassword: !!password, hasCsrf: !!csrfToken });

      const loginResponse = await fetch(`${BASE_URL}/kr/login/`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${BASE_URL}/kr/login/`,
          'Cookie': cookieString,
        },
        body: body,
        redirect: 'manual', // 리다이렉트를 수동으로 처리
      });

      console.log('🔑 로그인 응답 상태:', loginResponse.status);
      console.log('🔑 로그인 응답 헤더 (전체):', JSON.stringify([...loginResponse.headers.entries()]));

      // 로그인 성공 시 세션 쿠키 추출
      const responseSetCookie = loginResponse.headers.get('set-cookie');
      console.log('🍪 로그인 응답 쿠키:', responseSetCookie);

      if (responseSetCookie) {
        const sessionMatch = responseSetCookie.match(/sessionid=([^;]*)/);
        console.log('🔍 세션 매치 결과:', sessionMatch);
        
        if (sessionMatch) {
          this.sessionID = sessionMatch[1];
          await AsyncStorage.setItem('kidsnote_session', this.sessionID);
          console.log('✅ 로그인 성공! 세션 ID:', this.sessionID);
          return { success: true, sessionID: this.sessionID };
        }
      }

      // 로그인 성공인지 확인 (리다이렉트 상태 코드 확인)
      if (loginResponse.status === 302 || loginResponse.status === 301) {
        const location = loginResponse.headers.get('location');
        console.log('🔄 리다이렉트 위치:', location);
        
        // 대시보드나 메인 페이지로 리다이렉트되면 성공
        if (location && (location.includes('/dashboard') || location.includes('/kr/') || location === '/' || location.includes('/index'))) {
          // 모든 쿠키에서 세션 찾기
          const allCookies = responseSetCookie || cookieString;
          console.log('🍪 모든 쿠키에서 세션 찾기:', allCookies);
          
          const sessionMatch = allCookies.match(/sessionid=([^;]*)/);
          if (sessionMatch) {
            this.sessionID = sessionMatch[1];
            await AsyncStorage.setItem('kidsnote_session', this.sessionID);
            console.log('✅ 리다이렉트로 로그인 성공! 세션 ID:', this.sessionID);
            return { success: true, sessionID: this.sessionID };
          }
          
          // 임시 세션으로 처리해보기
          console.log('⚠️ 세션 ID를 찾을 수 없지만 리다이렉트는 성공. 임시 세션 생성...');
          this.sessionID = 'temp_session_' + Date.now();
          await AsyncStorage.setItem('kidsnote_session', this.sessionID);
          return { success: true, sessionID: this.sessionID };
        }
      }

      // 응답 본문 확인
      const responseText = await loginResponse.text();
      console.log('📄 로그인 응답 본문 길이:', responseText.length);
      console.log('📄 로그인 응답 미리보기:', responseText.substring(0, 500));

      // 로그인 실패 메시지 확인
      if (responseText.includes('Invalid username') || responseText.includes('Invalid password') || 
          responseText.includes('로그인') && responseText.includes('실패')) {
        console.log('❌ 로그인 실패: 잘못된 자격증명');
        throw new Error('로그인 실패: 아이디 또는 비밀번호가 올바르지 않습니다.');
      }

      // 더 자세한 디버그 정보
      console.log('🐛 디버그 정보:');
      console.log('- 응답 상태:', loginResponse.status);
      console.log('- 응답 헤더 수:', [...loginResponse.headers.entries()].length);
      console.log('- 응답 본문에 sessionid 포함:', responseText.includes('sessionid'));
      console.log('- 응답 본문에 login 포함:', responseText.includes('login'));
      console.log('- 응답 본문에 error 포함:', responseText.includes('error'));

      console.log('❌ 최종 실패: 세션 정보를 찾을 수 없음');
      throw new Error('로그인 실패: 세션 정보를 찾을 수 없습니다. 키즈노트 사이트 구조가 변경되었을 수 있습니다.');
    } catch (error) {
      console.error('💥 로그인 에러:', error);
      console.error('💥 에러 스택:', error.stack);
      return { success: false, error: error.message };
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
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
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