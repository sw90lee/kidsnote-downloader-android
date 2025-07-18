import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import DocumentPicker from '@react-native-documents/picker';

interface StorageSettingsProps {
  onClose: () => void;
  onSave: (path: string) => void;
}

const StorageSettings: React.FC<StorageSettingsProps> = ({ onClose, onSave }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [customPath, setCustomPath] = useState<string>('');
  const [availablePaths, setAvailablePaths] = useState<string[]>([]);

  useEffect(() => {
    loadCurrentPath();
    loadAvailablePaths();
  }, []);

  const loadCurrentPath = async () => {
    try {
      const saved = await AsyncStorage.getItem('download_path');
      const path = saved || getDefaultPath();
      setCurrentPath(path);
      setCustomPath(path);
    } catch (error) {
      console.error('Failed to load current path:', error);
      const defaultPath = getDefaultPath();
      setCurrentPath(defaultPath);
      setCustomPath(defaultPath);
    }
  };

  const getDefaultPath = () => {
    return `${RNFS.ExternalStorageDirectoryPath}/Download/KidsNote`;
  };

  const loadAvailablePaths = () => {
    const paths = [
      `${RNFS.ExternalStorageDirectoryPath}/Download/KidsNote`,
      `${RNFS.ExternalStorageDirectoryPath}/Pictures/KidsNote`,
      `${RNFS.ExternalStorageDirectoryPath}/DCIM/KidsNote`,
      `${RNFS.DocumentDirectoryPath}/KidsNote`,
      `${RNFS.ExternalDirectoryPath}/KidsNote`,
    ].filter(Boolean);
    
    setAvailablePaths(paths);
  };

  const selectFolder = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: DocumentPicker.types.directories,
      });

      if (result && result.length > 0) {
        const selectedPath = `${result[0].uri}/KidsNote`;
        setCustomPath(selectedPath);
        Alert.alert('폴더 선택됨', `선택된 경로: ${selectedPath}`);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Folder selection error:', error);
        Alert.alert('오류', '폴더 선택 중 오류가 발생했습니다.');
      }
    }
  };

  const validateAndCreatePath = async (path: string): Promise<boolean> => {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) {
        await RNFS.mkdir(path);
        console.log('Directory created:', path);
      }
      
      // Test write permission
      const testFile = `${path}/test.txt`;
      await RNFS.writeFile(testFile, 'test', 'utf8');
      await RNFS.unlink(testFile);
      
      return true;
    } catch (error) {
      console.error('Path validation error:', error);
      return false;
    }
  };

  const saveSettings = async () => {
    if (!customPath.trim()) {
      Alert.alert('오류', '저장 경로를 입력해주세요.');
      return;
    }

    const isValid = await validateAndCreatePath(customPath);
    if (!isValid) {
      Alert.alert(
        '경로 오류',
        '선택한 경로에 접근할 수 없거나 쓰기 권한이 없습니다. 다른 경로를 선택해주세요.'
      );
      return;
    }

    try {
      await AsyncStorage.setItem('download_path', customPath);
      setCurrentPath(customPath);
      onSave(customPath);
      Alert.alert('저장 완료', `저장 경로가 설정되었습니다:\n${customPath}`, [
        { text: '확인', onPress: onClose }
      ]);
    } catch (error) {
      console.error('Failed to save path:', error);
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  const selectPresetPath = (path: string) => {
    setCustomPath(path);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>저장소 설정</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>현재 저장 경로</Text>
        <Text style={styles.currentPath}>{currentPath}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>빠른 선택</Text>
        {availablePaths.map((path, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.pathOption,
              customPath === path && styles.pathOptionSelected
            ]}
            onPress={() => selectPresetPath(path)}
          >
            <Text style={[
              styles.pathOptionText,
              customPath === path && styles.pathOptionTextSelected
            ]}>
              {path}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>사용자 정의 경로</Text>
        <TextInput
          style={styles.input}
          value={customPath}
          onChangeText={setCustomPath}
          placeholder="저장할 폴더 경로를 입력하세요"
          multiline
        />
        
        <TouchableOpacity style={styles.browseButton} onPress={selectFolder}>
          <Text style={styles.browseButtonText}>📁 폴더 선택</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Text style={styles.saveButtonText}>저장</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>취소</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>💡 팁</Text>
        <Text style={styles.infoText}>
          • 기본 경로: Download/KidsNote{'\n'}
          • 사진/동영상은 Pictures/KidsNote 추천{'\n'}
          • 선택한 폴더가 없으면 자동 생성됩니다{'\n'}
          • 쓰기 권한이 있는 폴더만 선택 가능합니다
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#007bff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  currentPath: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    fontFamily: 'monospace',
  },
  pathOption: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  pathOptionSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e3f2fd',
  },
  pathOptionText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'monospace',
  },
  pathOptionTextSelected: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    minHeight: 60,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  browseButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  browseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoSection: {
    margin: 10,
    marginTop: 0,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#856404',
  },
  infoText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});

export default StorageSettings;