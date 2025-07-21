import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DownloadManager from '../services/DownloadManager';

const DownloadProgress = ({ downloadConfig, onDownloadComplete, onCancel }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentChild, setCurrentChild] = useState(0);

  useEffect(() => {
    startDownload();
    
    DownloadManager.setProgressCallback(setProgress);
    DownloadManager.setLogCallback((message) => {
      setLogs(prevLogs => [...prevLogs, {
        id: Date.now() + Math.random(),
        message,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    });

    return () => {
      DownloadManager.setProgressCallback(null);
      DownloadManager.setLogCallback(null);
    };
  }, []);

  const startDownload = async () => {
    setIsDownloading(true);
    
    try {
      for (let i = 0; i < downloadConfig.selectedChildren.length; i++) {
        const childId = downloadConfig.selectedChildren[i];
        setCurrentChild(i + 1);
        
        const isReport = downloadConfig.sourceType === '1';
        
        const result = await DownloadManager.downloadChildData(
          childId,
          downloadConfig.contentType,
          isReport,
          downloadConfig.startDate,
          downloadConfig.endDate
        );

        if (!result.success) {
          Alert.alert('다운로드 오류', `자녀 ID ${childId}: ${result.error}`);
        }
      }

      Alert.alert('완료', '모든 다운로드가 완료되었습니다!', [
        { text: '확인', onPress: onDownloadComplete }
      ]);
    } catch (error) {
      Alert.alert('오류', `다운로드 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };


  const getProgressText = () => {
    if (!progress) return '';
    
    const { type, current, total, progress: percentage, fileName } = progress;
    const typeText = type === 'image' ? '이미지' : '동영상';
    
    return `${typeText} ${current}/${total} (${Math.round(percentage)}%) - ${fileName}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>다운로드 진행 중</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {currentChild}/{downloadConfig.selectedChildren.length} 자녀 처리 중
        </Text>
        
        {progress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{getProgressText()}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress.progress || 0}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>다운로드 로그</Text>
        <ScrollView 
          style={styles.logScrollView}
          ref={(ref) => ref && ref.scrollToEnd({ animated: true })}
        >
          {logs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <Text style={styles.logTime}>{log.timestamp}</Text>
              <Text style={styles.logMessage}>{log.message}</Text>
            </View>
          ))}
        </ScrollView>
      </View>


      {isDownloading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  logScrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 10,
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  logTime: {
    fontSize: 12,
    color: '#999',
    marginRight: 10,
    minWidth: 60,
  },
  logMessage: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DownloadProgress;