import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import KidsNoteAPI from '../services/KidsNoteAPI';

const LoginTest = () => {
  const [testResults, setTestResults] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message) => {
    setTestResults(prev => prev + message + '\n');
    console.log(message);
  };

  const testLogin = async () => {
    setIsLoading(true);
    setTestResults('');
    
    addLog('=== 키즈노트 로그인 테스트 시작 ===');
    
    // 테스트 계정 정보
    const username = 'sw90lee';
    const password = 'dhksauddA1!';
    
    try {
      const result = await KidsNoteAPI.login(username, password);
      
      if (result.success) {
        addLog('✅ 로그인 성공!');
        addLog('세션 ID: ' + result.sessionID);
        
        // 자녀 정보 가져오기 테스트
        addLog('\n=== 자녀 정보 가져오기 테스트 ===');
        const childrenResult = await KidsNoteAPI.getChildren();
        
        if (childrenResult.success) {
          addLog('✅ 자녀 정보 가져오기 성공!');
          addLog('자녀 목록: ' + JSON.stringify(childrenResult.children, null, 2));
        } else {
          addLog('❌ 자녀 정보 가져오기 실패: ' + childrenResult.error);
        }
        
        // 로그아웃 테스트
        addLog('\n=== 로그아웃 테스트 ===');
        await KidsNoteAPI.logout();
        addLog('✅ 로그아웃 완료');
        
      } else {
        addLog('❌ 로그인 실패: ' + result.error);
      }
    } catch (error) {
      addLog('💥 테스트 중 오류 발생: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>키즈노트 API 테스트</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '테스트 중...' : '로그인 테스트 시작'}
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.logContainer}>
        <Text style={styles.logText}>{testResults}</Text>
      </ScrollView>
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
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
  },
  logText: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default LoginTest;