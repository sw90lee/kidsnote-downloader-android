import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import axios from 'axios';
import CookieManager from '@react-native-cookies/cookies';

const BASE_URL = 'https://www.kidsnote.com';
const API_BASE = '/api/v1_2';

class KidsNoteAPI {
  constructor() {
    this.sessionID = null;
    
    // 로그인 전용 axios 인스턴스 (기존)
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // API 호출 전용 axios 인스턴스 (새로 생성)
    this.apiInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': BASE_URL,
      },
    });
  }

  async makeRequest(endpoint, options = {}) {
    console.log('🔍 makeRequest 호출:');
    console.log('  - endpoint:', endpoint);
    console.log('  - BASE_URL:', BASE_URL);
    console.log('  - endpoint 타입:', typeof endpoint);
    console.log('  - endpoint 길이:', endpoint ? endpoint.length : 'undefined');
    
    // URL 구성 전 유효성 검사
    if (!endpoint) {
      console.error('❌ endpoint가 비어있습니다!');
      throw new Error('API 엔드포인트가 정의되지 않았습니다.');
    }
    
    const url = `${BASE_URL}${endpoint}`;
    console.log('  - 최종 URL:', url);
    console.log('  - URL 길이:', url.length);
    
    try {
      console.log('🌐 API 요청:', url);
      
      // 세션 로드
      if (!this.sessionID) {
        await this.loadSession();
      }
      
      // CookieManager에서 쿠키 가져오기
      const cookies = await CookieManager.get(BASE_URL);
      console.log('🍪 CookieManager 쿠키:', cookies);
      console.log('🍪 현재 sessionID:', this.sessionID ? this.sessionID.substring(0, 10) + '...' : '없음');
      
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': BASE_URL,
        ...options.headers,
      };

      // sessionid 쿠키 설정 (origin.js와 동일한 형태)
      if (cookies.sessionid) {
        headers.Cookie = `sessionid=${cookies.sessionid.value};`;
        this.sessionID = cookies.sessionid.value; // 동기화
        console.log('🍪 CookieManager 세션 사용:', cookies.sessionid.value.substring(0, 10) + '...');
      } else if (this.sessionID) {
        headers.Cookie = `sessionid=${this.sessionID};`;
        console.log('🍪 저장된 세션 사용:', this.sessionID.substring(0, 10) + '...');
      } else {
        console.log('❌ 세션 없음!');
        throw new Error('세션이 필요합니다. 다시 로그인해주세요.');
      }
      
      console.log('🍪 최종 쿠키 헤더:', headers.Cookie);

      console.log('🚀 요청 헤더:', JSON.stringify(headers, null, 2));
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        ...options,
      });

      console.log('📊 응답 상태:', response.status, response.statusText);
      console.log('📊 응답 헤더:', JSON.stringify([...response.headers.entries()], null, 2));
      
      if (!response.ok) {
        // 응답 본문도 확인해보기
        const errorText = await response.text();
        console.log('❌ 에러 응답 본문:', errorText);
        
        if (response.status === 401) {
          throw new Error('세션 만료! 다시 로그인해주세요.');
        } else if (response.status === 403) {
          throw new Error('접근 권한이 없습니다. 로그인을 확인해주세요.');
        } else if (response.status === 404) {
          console.log('🔍 404 에러 상세 정보:');
          console.log('  - URL:', url);
          console.log('  - endpoint:', endpoint);
          console.log('  - 에러 본문:', errorText);
          console.log('  - URL 확인:', url || 'URL이 undefined입니다');
          throw new Error(`API 엔드포인트를 찾을 수 없습니다: ${url || '정의되지 않은 URL'}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
      }
      
      const data = await response.json();
      console.log('📦 응답 데이터 크기:', JSON.stringify(data).length, 'bytes');
      
      return { response, data };
    } catch (error) {
      console.error('Request error:', error);
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
      const { data } = await this.makeRequest('/api/v1/me/info');
      
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

  async getReports(childId, pageSize = 20, startDate = null, endDate = null) {
    try {
      // origin.js와 동일한 엔드포인트 사용
      let endpoint = `/api/v1_2/children/${childId}/reports/?page_size=${pageSize}&tz=Asia%2FSeoul&child=${childId}`;
      
      // 날짜 필터링 파라미터 추가 (가장 일반적인 패턴만 시도)
      if (startDate) {
        endpoint += `&from_date=${startDate}`;
      }
      if (endDate) {
        endpoint += `&to_date=${endDate}`;
      }
      
      console.log(`📋 getReports 요청: ${endpoint}`);
      console.log(`📋 최종 URL: ${BASE_URL}${endpoint}`);
      console.log(`📋 childId: ${childId}, pageSize: ${pageSize}, startDate: ${startDate}, endDate: ${endDate}`);
      const { data } = await this.makeRequest(endpoint);
      console.log(`📋 getReports 응답 요약:`, {
        resultsCount: data.results ? data.results.length : 0,
        hasNext: data.next !== null,
        nextUrl: data.next ? data.next.substring(0, 100) + '...' : null
      });
      
      // 이미지/비디오 URL 구조 상세 확인
      if (data.results && data.results.length > 0) {
        const firstReport = data.results[0];
        console.log(`📋 첫 번째 리포트 샘플:`, JSON.stringify(firstReport, null, 2));
        
        if (firstReport.attached_images && firstReport.attached_images.length > 0) {
          const firstImage = firstReport.attached_images[0];
          console.log(`🖼️ 첫 번째 이미지 정보:`, JSON.stringify(firstImage, null, 2));
          console.log(`🔗 이미지 original URL: ${firstImage.original}`);
          console.log(`🔗 이미지 original_file_name: ${firstImage.original_file_name}`);
          
          // URL이 상대경로인지 절대경로인지 확인
          if (firstImage.original) {
            console.log(`🔍 URL 분석:`);
            console.log(`  - 시작 문자: ${firstImage.original.substring(0, 20)}...`);
            console.log(`  - http로 시작: ${firstImage.original.startsWith('http')}`);
            console.log(`  - /로 시작: ${firstImage.original.startsWith('/')}`);
          }
        }
        
        if (firstReport.attached_video) {
          console.log(`🎥 비디오 정보:`, JSON.stringify(firstReport.attached_video, null, 2));
          console.log(`🔗 비디오 high URL: ${firstReport.attached_video.high}`);
          console.log(`🔗 비디오 original URL: ${firstReport.attached_video.original}`);
        }
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Get reports error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAlbums(childId, pageSize = 20, startDate = null, endDate = null) {
    try {
      // origin.js와 동일한 엔드포인트 사용
      let endpoint = `/api/v1_2/children/${childId}/albums/?page_size=${pageSize}&tz=Asia%2FSeoul&child=${childId}`;
      
      // 날짜 필터링 파라미터 추가 (가장 일반적인 패턴만 시도)
      if (startDate) {
        endpoint += `&from_date=${startDate}`;
      }
      if (endDate) {
        endpoint += `&to_date=${endDate}`;
      }
      
      console.log(`📸 getAlbums 요청: ${endpoint}`);
      console.log(`📸 최종 URL: ${BASE_URL}${endpoint}`);
      console.log(`📸 childId: ${childId}, pageSize: ${pageSize}, startDate: ${startDate}, endDate: ${endDate}`);
      const { data } = await this.makeRequest(endpoint);
      console.log(`📸 getAlbums 응답 요약:`, {
        resultsCount: data.results ? data.results.length : 0,
        hasNext: data.next !== null,
        nextUrl: data.next ? data.next.substring(0, 100) + '...' : null
      });
      
      // 이미지/비디오 URL 구조 상세 확인
      if (data.results && data.results.length > 0) {
        const firstAlbum = data.results[0];
        console.log(`📸 첫 번째 앨범 샘플:`, JSON.stringify(firstAlbum, null, 2));
        
        if (firstAlbum.attached_images && firstAlbum.attached_images.length > 0) {
          const firstImage = firstAlbum.attached_images[0];
          console.log(`🖼️ 첫 번째 이미지 정보:`, JSON.stringify(firstImage, null, 2));
          console.log(`🔗 이미지 original URL: ${firstImage.original}`);
          console.log(`🔗 이미지 original_file_name: ${firstImage.original_file_name}`);
          
          // URL이 상대경로인지 절대경로인지 확인
          if (firstImage.original) {
            console.log(`🔍 URL 분석:`);
            console.log(`  - 시작 문자: ${firstImage.original.substring(0, 20)}...`);
            console.log(`  - http로 시작: ${firstImage.original.startsWith('http')}`);
            console.log(`  - /로 시작: ${firstImage.original.startsWith('/')}`);
          }
        }
        
        if (firstAlbum.attached_video) {
          console.log(`🎥 비디오 정보:`, JSON.stringify(firstAlbum.attached_video, null, 2));
          console.log(`🔗 비디오 high URL: ${firstAlbum.attached_video.high}`);
          console.log(`🔗 비디오 original URL: ${firstAlbum.attached_video.original}`);
        }
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Get albums error:', error);
      return { success: false, error: error.message };
    }
  }

  async downloadFile(url, destinationPath, onProgress, customPath = null) {
    try {
      // Use custom path if provided, otherwise default to DocumentDirectory
      const basePath = customPath || RNFS.DocumentDirectoryPath;
      const downloadDest = `${basePath}/${destinationPath}`;
      const dirPath = downloadDest.substring(0, downloadDest.lastIndexOf('/'));
      
      await RNFS.mkdir(dirPath);

      // 세션 확인
      if (!this.sessionID) {
        await this.loadSession();
      }

      // 헤더 설정
      const headers = {
        'User-Agent': 'Mozilla/5.0',
      };
      
      // 세션 쿠키 추가 (필요한 경우를 위해)
      if (this.sessionID) {
        headers['Cookie'] = `sessionid=${this.sessionID}`;
        console.log(`🍪 쿠키 헤더 추가: sessionid=${this.sessionID.substring(0, 10)}...`);
      }

      // URL 처리 로직
      let downloadUrl = url;
      console.log(`🔗 원본 URL: ${url}`);
      
      // 상대경로인 경우 절대경로로 변환
      if (url && !url.startsWith('http')) {
        downloadUrl = url.startsWith('/') ? `${BASE_URL}${url}` : `${BASE_URL}/${url}`;
        console.log(`🔄 상대경로를 절대경로로 변환: ${downloadUrl}`);
      }
      
      console.log(`🔗 최종 다운로드 URL: ${downloadUrl}`);

      console.log(`📥 다운로드 시작: ${downloadUrl}`);
      console.log(`🍪 세션 ID: ${this.sessionID ? this.sessionID.substring(0, 10) + '...' : '없음'}`);
      console.log(`📂 저장 경로: ${downloadDest}`);

      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: downloadDest,
        headers,
        progress: (res) => {
          if (onProgress) {
            const progress = (res.bytesWritten / res.contentLength) * 100;
            onProgress(progress);
          }
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log(`✅ 다운로드 성공: ${destinationPath}`);
        return { success: true, path: downloadDest };
      } else {
        console.error(`❌ 다운로드 실패: HTTP ${downloadResult.statusCode} - ${url}`);
        throw new Error(`HTTP ${downloadResult.statusCode}: 서버 오류가 발생했습니다.`);
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

  async getDownloadPath() {
    try {
      const savedPath = await AsyncStorage.getItem('download_path');
      return savedPath || `${RNFS.ExternalStorageDirectoryPath}/Download/KidsNote`;
    } catch (error) {
      console.error('Failed to get download path:', error);
      return `${RNFS.ExternalStorageDirectoryPath}/Download/KidsNote`;
    }
  }

  async setDownloadPath(path) {
    try {
      await AsyncStorage.setItem('download_path', path);
      return true;
    } catch (error) {
      console.error('Failed to set download path:', error);
      return false;
    }
  }
}

export default new KidsNoteAPI();