import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import KidsNoteAPI from './KidsNoteAPI';

class DownloadManager {
  constructor() {
    this.isDownloading = false;
    this.onProgress = null;
    this.onLog = null;
  }

  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  setLogCallback(callback) {
    this.onLog = callback;
  }

  log(message) {
    console.log(message);
    if (this.onLog) {
      this.onLog(message);
    }
  }

  async requestStoragePermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 33) {
        // Android 13 이상: 이미지, 비디오, 오디오 권한 요청
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ]);

        const allGranted = Object.values(granted).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert(
            '파일 및 미디어 권한 필요',
            '파일 다운로드를 위해 "파일 및 미디어" 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
            [
              { text: '취소', style: 'cancel' },
              { 
                text: '설정으로 이동', 
                onPress: () => Linking.openSettings()
              }
            ]
          );
          return false;
        }

        return true;
      } else if (Platform.Version >= 30) {
        // Android 11~12: MANAGE_EXTERNAL_STORAGE는 직접 요청할 수 없음
        Alert.alert(
          '저장소 권한 필요',
          '파일 다운로드를 위해 "모든 파일에 액세스" 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '설정으로 이동', 
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      } else {
        // Android 10 이하: WRITE_EXTERNAL_STORAGE 요청
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: '저장소 권한',
            message: '파일을 다운로드하기 위해 저장소 접근 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '취소',
            buttonPositive: '확인',
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  async createDownloadDirectory(basePath) {
    try {
      // Android 다양한 버전 대응을 위한 다중 경로 시도
      const possiblePaths = [
        // 1순위: 사용자 지정 경로 (있는 경우)
        basePath,
        // 2순위: Downloads 폴더 (가장 안전)
        `${RNFS.DownloadDirectoryPath}/KidsNote`,
        // 3순위: DocumentDirectory (앱 전용 공간)
        `${RNFS.DocumentDirectoryPath}/KidsNote`,
        // 4순위: ExternalCachesDirectory (임시 저장)
        `${RNFS.ExternalCachesDirectoryPath}/KidsNote`
      ].filter(path => path); // null/undefined 제거

      let downloadPath = null;
      let lastError = null;

      for (const path of possiblePaths) {
        try {
          this.log(`📁 저장 경로 시도: ${path}`);
          
          const exists = await RNFS.exists(path);
          if (!exists) {
            await RNFS.mkdir(path);
          }
          
          // 쓰기 권한 테스트
          const testFile = `${path}/test_write.txt`;
          await RNFS.writeFile(testFile, 'test', 'utf8');
          await RNFS.unlink(testFile);
          
          downloadPath = path;
          this.log(`✅ 저장 경로 확정: ${downloadPath}`);
          break;
        } catch (error) {
          lastError = error;
          this.log(`❌ 경로 실패: ${path} - ${error.message}`);
          continue;
        }
      }

      if (!downloadPath) {
        throw new Error(`모든 저장 경로에서 쓰기 실패. 마지막 오류: ${lastError?.message}`);
      }
      
      return downloadPath;
    } catch (error) {
      this.log(`폴더 생성 오류: ${error.message}`);
      throw error;
    }
  }

  // origin.js 방식: 재시도 로직 포함한 다운로드
  async downloadWithRetry(url, destinationPath, onProgress, retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await KidsNoteAPI.downloadFile(url, destinationPath, onProgress);
        
        if (result.success) {
          return result;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        if (attempt < retries) {
          this.log(`❌ 다운로드 실패 (${attempt}/${retries}): ${error.message}`);
          this.log(`🔄 5초 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // origin.js와 동일한 5초 대기
        } else {
          this.log(`❌ 최종 다운로드 실패 (${retries}번 시도): ${error.message}`);
          return { success: false, error: error.message };
        }
      }
    }
  }

  async processImages(images, childName, className, formattedDate) {
    const results = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        const extension = KidsNoteAPI.getFileExtension(image.original_file_name);
        const fileName = className 
          ? `${formattedDate}-${className}-${childName}-${image.id}${extension}`
          : `${formattedDate}-${childName}-${image.id}${extension}`;
        
        // origin.js 방식: 상세 로그 최소화
        this.log(`📥 이미지 다운로드: ${fileName}`);
        
        // origin.js 방식: 재시도 로직 포함한 다운로드
        const result = await this.downloadWithRetry(
          image.original,
          `KidsNote/${fileName}`,
          (progress) => {
            if (this.onProgress) {
              this.onProgress({
                type: 'image',
                current: i + 1,
                total: images.length,
                progress: progress,
                fileName: fileName,
              });
            }
          },
          5  // origin.js와 동일한 5번 재시도
        );

        if (result.success) {
          results.push(result);
          // origin.js 방식: 성공 시 조용히 처리
        } else {
          this.log(`❌ 다운로드 실패: ${fileName} - ${result.error}`);
        }

        // origin.js와 동일한 0.1초 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.log(`❌ 이미지 처리 오류: ${error.message}`);
      }
    }

    return results;
  }

  async processVideo(video, childName, className, formattedDate) {
    try {
      const extension = KidsNoteAPI.getFileExtension(video.original_file_name);
      const fileName = className 
        ? `${formattedDate}-${className}-${childName}-${video.id}${extension}`
        : `${formattedDate}-${childName}-${video.id}${extension}`;
      
      // origin.js 방식: 상세 로그 최소화
      this.log(`🎥 동영상 다운로드: ${fileName}`);
      const videoUrl = video.high || video.original;
      
      // origin.js 방식: 재시도 로직 포함한 다운로드
      const result = await this.downloadWithRetry(
        videoUrl,
        `KidsNote/${fileName}`,
        (progress) => {
          if (this.onProgress) {
            this.onProgress({
              type: 'video',
              current: 1,
              total: 1,
              progress: progress,
              fileName: fileName,
            });
          }
        },
        5  // origin.js와 동일한 5번 재시도
      );

      if (result.success) {
        // origin.js 방식: 성공 시 조용히 처리
        return result;
      } else {
        this.log(`❌ 동영상 다운로드 실패: ${fileName} - ${result.error}`);
        return null;
      }
    } catch (error) {
      this.log(`❌ 동영상 처리 오류: ${error.message}`);
      return null;
    }
  }

  async processEntries(entries, type, isReport, startDate, endDate) {
    const dateGroups = new Map();
    
    for (const entry of entries) {
      let rawDate;
      
      if (isReport) {
        rawDate = entry.date_written;
      } else {
        rawDate = entry.modified ? entry.modified.split('T')[0] : null;
      }
      
      if (!KidsNoteAPI.isDateInRange(rawDate, startDate, endDate)) {
        continue;
      }
      
      if (!rawDate) continue;
      
      if (!dateGroups.has(rawDate)) {
        dateGroups.set(rawDate, []);
      }
      dateGroups.get(rawDate).push(entry);
    }
    
    const sortedDates = Array.from(dateGroups.keys()).sort();
    
    for (const date of sortedDates) {
      const dateEntries = dateGroups.get(date);
      this.log(`📅 ${date} 날짜 데이터 처리 시작...`);
      
      let dateItemCount = 0;
      
      for (const entry of dateEntries) {
        const formattedDate = KidsNoteAPI.formatDate(date);
        
        if (isReport) {
          const { class_name, child_name, attached_images, attached_video } = entry;
          
          if ((type === '1' || type === 'all') && Array.isArray(attached_images) && attached_images.length > 0) {
            dateItemCount += attached_images.length;
            await this.processImages(attached_images, child_name, class_name, formattedDate);
          }
          
          if ((type === '2' || type === 'all') && attached_video) {
            dateItemCount += 1;
            await this.processVideo(attached_video, child_name, class_name, formattedDate);
          }
        } else {
          const { child_name, attached_images, attached_video } = entry;
          
          if ((type === '1' || type === 'all') && Array.isArray(attached_images) && attached_images.length > 0) {
            dateItemCount += attached_images.length;
            await this.processImages(attached_images, child_name, null, formattedDate);
          }
          
          if ((type === '2' || type === 'all') && attached_video) {
            dateItemCount += 1;
            await this.processVideo(attached_video, child_name, null, formattedDate);
          }
        }
      }
      
      this.log(`📅 ${date} 날짜 다운로드 완료 (${dateItemCount}개 항목)`);
    }
    
    if (sortedDates.length > 0) {
      this.log(`✅ 총 ${sortedDates.length}개 날짜 처리 완료`);
      this.log(`📊 처리된 날짜: ${sortedDates.join(', ')}`);
    }
  }

  async downloadChildData(childId, type, isReport, startDate = null, endDate = null) {
    try {
      this.isDownloading = true;
      
      // 저장소 경로 설정 및 생성
      const downloadPath = await this.createDownloadDirectory();
      this.log(`📁 저장소 경로 설정 완료: ${downloadPath}`);
      
      this.log(`다운로드 시작 - 자녀 ID: ${childId}`);
      if (startDate || endDate) {
        this.log(`날짜 필터: ${startDate || '제한없음'} ~ ${endDate || '제한없음'}`);
      }

      // origin.js 방식 완전 적용: 재귀적으로 더 큰 page_size로 요청
      const allEntries = await this.getJsonRecursive(childId, type, isReport, 'all', 1, startDate, endDate);
      this.log(`✅ 모든 데이터 로딩 완료! 총 ${allEntries.length}개 항목`);

      // 날짜 필터링 정보 출력
      if (startDate || endDate) {
        this.log(`📅 날짜 필터링 적용 중: ${startDate || '시작일 없음'} ~ ${endDate || '종료일 없음'}`);
        
        // 필터링 전 총 항목 수
        this.log(`📊 필터링 전 총 항목 수: ${allEntries.length}`);
        
        // 날짜 필터링 테스트
        const filteredEntries = allEntries.filter(entry => {
          let rawDate;
          
          if (isReport) {
            rawDate = entry.date_written;
          } else {
            rawDate = entry.modified ? entry.modified.split('T')[0] : null;
          }
          
          return KidsNoteAPI.isDateInRange(rawDate, startDate, endDate);
        });
        
        this.log(`📊 필터링 후 항목 수: ${filteredEntries.length}`);
        
        if (filteredEntries.length === 0) {
          this.log(`⚠️ 설정된 날짜 범위에 해당하는 데이터가 없습니다.`);
        }
      }

      await this.processEntries(allEntries, type, isReport, startDate, endDate);
      
      this.log('🎉 다운로드 완료!');
      return { success: true };
      
    } catch (error) {
      this.log(`❌ 다운로드 오류: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      this.isDownloading = false;
    }
  }

  // origin.js의 getJson 함수를 React Native로 구현
  async getJsonRecursive(childId, type, isReport, size, index, startDate = null, endDate = null) {
    // origin.js와 동일한 로직: size === 'all' ? 9999 * index : size
    const downloadSize = size === 'all' ? 9999 * index : size;
        
    const result = isReport 
      ? await KidsNoteAPI.getReports(childId, downloadSize, startDate, endDate)
      : await KidsNoteAPI.getAlbums(childId, downloadSize, startDate, endDate);

    if (!result.success) {
      throw new Error(result.error);
    }

    this.log(`📊 응답 데이터 상태:`, {
      resultsCount: result.data.results ? result.data.results.length : 0,
      hasNext: result.data.next !== null,
      nextUrl: result.data.next ? result.data.next.substring(0, 50) + '...' : null
    });

    // origin.js 로직: next가 있으면 index + 1로 재귀 호출
    if (size === 'all' && result.data.next !== null) {
      this.log(`📄 더 많은 데이터가 있습니다. 재귀 호출 ${index + 1}번째 시작...`);
      
      // 무한 루프 방지: 최대 10번까지만
      if (index >= 10) {
        this.log(`⚠️ 최대 재귀 호출 수(10)에 도달했습니다. 현재까지의 데이터로 진행합니다.`);
        return result.data.results || [];
      }
      
      return await this.getJsonRecursive(childId, type, isReport, size, index + 1, startDate, endDate);
    } else {
      // 더 이상 데이터가 없거나 size가 'all'이 아닌 경우
      return result.data.results || [];
    }
  }

}

export default new DownloadManager();