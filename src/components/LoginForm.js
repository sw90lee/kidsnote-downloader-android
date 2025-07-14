import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import KidsNoteAPI from '../services/KidsNoteAPI';

const LoginForm = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    console.log('🎯 LoginForm: 로그인 버튼 클릭됨');
    
    if (!username.trim() || !password.trim()) {
      console.log('❌ LoginForm: 입력값 검증 실패');
      Alert.alert('오류', '아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    console.log('⏳ LoginForm: 로그인 시작, 로딩 상태 설정');
    setIsLoading(true);
    
    try {
      console.log('📞 LoginForm: KidsNoteAPI.login 호출');
      const result = await KidsNoteAPI.login(username, password);
      
      console.log('📨 LoginForm: 로그인 결과:', result);
      
      if (result.success) {
        console.log('✅ LoginForm: 로그인 성공!');
        Alert.alert('성공', '로그인에 성공했습니다!', [
          { text: '확인', onPress: () => {
              console.log('👆 LoginForm: 성공 확인 버튼 클릭, onLoginSuccess 호출');
              onLoginSuccess(result.sessionID);
            }
          }
        ]);
      } else {
        console.log('❌ LoginForm: 로그인 실패:', result.error);
        Alert.alert('로그인 실패', `${result.error}\n\n디버그 정보: Android logcat을 확인하세요.`);
      }
    } catch (error) {
      console.error('💥 LoginForm: 로그인 예외 발생:', error);
      Alert.alert('오류', `로그인 중 오류가 발생했습니다: ${error.message}\n\nlogcat을 확인하여 자세한 정보를 보세요.`);
    } finally {
      console.log('🏁 LoginForm: 로딩 상태 해제');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>키즈노트 다운로더</Text>
      <Text style={styles.subtitle}>로그인하여 시작하세요</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>아이디</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="키즈노트 아이디를 입력하세요"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호를 입력하세요"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.loginButtonText}>로그인</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.info}>
        키즈노트 웹사이트와 동일한 계정 정보를 사용하세요.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  info: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 14,
  },
});

export default LoginForm;