import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform } from 'react-native';
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
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  async createDownloadDirectory(basePath) {
    try {
      const downloadPath = `${RNFS.DownloadDirectoryPath}/KidsNote`;
      const exists = await RNFS.exists(downloadPath);
      
      if (!exists) {
        await RNFS.mkdir(downloadPath);
        this.log(`다운로드 폴더 생성: ${downloadPath}`);
      }
      
      return downloadPath;
    } catch (error) {
      this.log(`폴더 생성 오류: ${error.message}`);
      throw error;
    }
  }

  async processImages(images, childName, className, formattedDate, downloadPath) {
    const results = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        const extension = KidsNoteAPI.getFileExtension(image.original_file_name);
        const fileName = className 
          ? `${formattedDate}-${className}-${childName}-${image.id}${extension}`
          : `${formattedDate}-${childName}-${image.id}${extension}`;
        
        this.log(`이미지 다운로드 중: ${fileName}`);
        
        const result = await KidsNoteAPI.downloadFile(
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
          }
        );

        if (result.success) {
          results.push(result);
          this.log(`✅ 다운로드 완료: ${fileName}`);
        } else {
          this.log(`❌ 다운로드 실패: ${fileName} - ${result.error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.log(`❌ 이미지 처리 오류: ${error.message}`);
      }
    }

    return results;
  }

  async processVideo(video, childName, className, formattedDate, downloadPath) {
    try {
      const extension = KidsNoteAPI.getFileExtension(video.original_file_name);
      const fileName = className 
        ? `${formattedDate}-${className}-${childName}-${video.id}${extension}`
        : `${formattedDate}-${childName}-${video.id}${extension}`;
      
      this.log(`동영상 다운로드 중: ${fileName}`);
      
      const result = await KidsNoteAPI.downloadFile(
        video.high || video.original,
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
        }
      );

      if (result.success) {
        this.log(`✅ 동영상 다운로드 완료: ${fileName}`);
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
      
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        throw new Error('저장소 권한이 필요합니다.');
      }

      const downloadPath = await this.createDownloadDirectory();
      
      this.log(`다운로드 시작 - 자녀 ID: ${childId}`);
      if (startDate || endDate) {
        this.log(`날짜 필터: ${startDate || '제한없음'} ~ ${endDate || '제한없음'}`);
      }

      let allEntries = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = isReport 
          ? await KidsNoteAPI.getReports(childId, 50, page)
          : await KidsNoteAPI.getAlbums(childId, 50, page);

        if (!result.success) {
          throw new Error(result.error);
        }

        allEntries = allEntries.concat(result.data.results || []);
        
        hasMore = result.data.next !== null;
        page++;
        
        if (hasMore) {
          this.log(`페이지 ${page} 데이터 로딩 중...`);
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

  stopDownload() {
    this.isDownloading = false;
    this.log('다운로드가 중단되었습니다.');
  }
}

export default new DownloadManager();