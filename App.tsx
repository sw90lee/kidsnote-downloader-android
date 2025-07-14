import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Alert,
} from 'react-native';

import LoginForm from './src/components/LoginForm';
import ChildrenSelection from './src/components/ChildrenSelection';
import DownloadOptions from './src/components/DownloadOptions';
import DownloadProgress from './src/components/DownloadProgress';
import LoginTest from './src/components/LoginTest';
import KidsNoteAPI from './src/services/KidsNoteAPI';

type AppState = 'login' | 'children' | 'options' | 'downloading' | 'test';

function App(): React.JSX.Element {
  const [currentState, setCurrentState] = useState<AppState>('test'); // 테스트 모드로 시작
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [downloadConfig, setDownloadConfig] = useState<any>(null);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const session = await KidsNoteAPI.loadSession();
      if (session) {
        // 세션이 유효한지 확인
        try {
          const result = await KidsNoteAPI.getChildren();
          if (result.success) {
            setCurrentState('children');
          }
        } catch {
          // 세션이 만료된 경우 로그아웃
          await KidsNoteAPI.logout();
        }
      }
    } catch (error) {
      console.log('Session check failed:', error);
      // 세션 체크 실패 시 로그인 화면 유지
    }
  };

  const handleLoginSuccess = (sessionID: string) => {
    setCurrentState('children');
  };

  const handleChildrenSelected = (children: string[]) => {
    setSelectedChildren(children);
    setCurrentState('options');
  };

  const handleStartDownload = (config: any) => {
    setDownloadConfig(config);
    setCurrentState('downloading');
  };

  const handleDownloadComplete = () => {
    Alert.alert('완료', '다운로드가 완료되었습니다!', [
      { text: '확인', onPress: () => setCurrentState('children') }
    ]);
  };

  const handleDownloadCancel = () => {
    setCurrentState('options');
  };

  const renderCurrentScreen = () => {
    switch (currentState) {
      case 'test':
        return <LoginTest />;
      case 'login':
        return <LoginForm onLoginSuccess={handleLoginSuccess} />;
      case 'children':
        return <ChildrenSelection onChildrenSelected={handleChildrenSelected} />;
      case 'options':
        return (
          <DownloadOptions
            selectedChildren={selectedChildren}
            onStartDownload={handleStartDownload}
          />
        );
      case 'downloading':
        return (
          <DownloadProgress
            downloadConfig={downloadConfig}
            onDownloadComplete={handleDownloadComplete}
            onCancel={handleDownloadCancel}
          />
        );
      default:
        return <LoginTest />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default App;