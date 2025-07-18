import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import RNFS from 'react-native-fs';

interface FolderItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mtime?: Date;
}

interface FolderBrowserProps {
  onSelectFolder: (path: string) => void;
  onClose: () => void;
  initialPath?: string;
}

const FolderBrowser: React.FC<FolderBrowserProps> = ({ 
  onSelectFolder, 
  onClose, 
  initialPath 
}) => {
  const [currentPath, setCurrentPath] = useState<string>(
    initialPath || RNFS.ExternalStorageDirectoryPath
  );
  const [items, setItems] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    checkPermissionsAndLoad();
  }, [currentPath]);

  const checkPermissionsAndLoad = async () => {
    const hasPermission = await checkStoragePermissions();
    if (hasPermission) {
      loadDirectory(currentPath);
    } else {
      // 권한이 없으면 닫기
      onClose();
    }
  };

  const checkStoragePermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Android 11+ (API 30+)
      if (Platform.Version >= 30) {
        Alert.alert(
          '저장소 권한 필요',
          '폴더 브라우저를 사용하려면 "모든 파일에 액세스" 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel', onPress: () => onClose() },
            { 
              text: '설정으로 이동', 
              onPress: async () => {
                try {
                  await Linking.openSettings();
                  onClose();
                } catch (error) {
                  console.error('Failed to open settings:', error);
                  onClose();
                }
              }
            }
          ]
        );
        return false;
      } else {
        // Android 10 이하
        const permissions = [
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        const allGranted = Object.values(granted).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          Alert.alert(
            '권한 필요',
            '폴더 브라우저를 사용하려면 저장소 권한이 필요합니다.',
            [
              { text: '취소', style: 'cancel', onPress: () => onClose() },
              { 
                text: '설정으로 이동', 
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                    onClose();
                  } catch (error) {
                    console.error('Failed to open settings:', error);
                    onClose();
                  }
                }
              }
            ]
          );
          return false;
        }

        // Android 13+ 미디어 권한 추가 요청
        if (Platform.Version >= 33) {
          const mediaPermissions = [
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
          ];

          await PermissionsAndroid.requestMultiple(mediaPermissions);
        }

        return true;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      Alert.alert('오류', '권한 확인 중 오류가 발생했습니다.');
      onClose();
      return false;
    }
  };

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const files = await RNFS.readDir(path);
      
      const folderItems: FolderItem[] = files
        .filter(file => file.isDirectory()) // 폴더만 표시
        .map(file => ({
          name: file.name,
          path: file.path,
          isDirectory: file.isDirectory(),
          size: file.size,
          mtime: file.mtime,
        }))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

      setItems(folderItems);
    } catch (error) {
      console.error('Failed to load directory:', error);
      Alert.alert('오류', '폴더를 읽을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderPath: string) => {
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(folderPath);
  };

  const goBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      setCurrentPath(previousPath);
    } else {
      // 루트까지 갔을 때 상위 디렉토리로
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      if (parentPath) {
        setCurrentPath(parentPath);
      }
    }
  };

  const goToRoot = () => {
    setPathHistory([]);
    setCurrentPath(RNFS.ExternalStorageDirectoryPath);
  };

  const createNewFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('오류', '폴더 이름을 입력해주세요.');
      return;
    }

    // 권한 재확인
    const hasPermission = await checkStoragePermissions();
    if (!hasPermission) {
      return;
    }

    const newFolderPath = `${currentPath}/${newFolderName.trim()}`;
    
    try {
      const exists = await RNFS.exists(newFolderPath);
      if (exists) {
        Alert.alert('오류', '같은 이름의 폴더가 이미 존재합니다.');
        return;
      }

      await RNFS.mkdir(newFolderPath);
      setNewFolderName('');
      setShowNewFolderModal(false);
      loadDirectory(currentPath); // 폴더 목록 새로고침
      
      Alert.alert('성공', `'${newFolderName}' 폴더가 생성되었습니다.`);
    } catch (error) {
      console.error('Failed to create folder:', error);
      Alert.alert('오류', '폴더를 생성할 수 없습니다. 권한을 확인해주세요.');
    }
  };

  const selectCurrentFolder = () => {
    onSelectFolder(currentPath);
  };

  const getDisplayPath = () => {
    if (currentPath.startsWith(RNFS.ExternalStorageDirectoryPath)) {
      return currentPath.replace(RNFS.ExternalStorageDirectoryPath, '/storage');
    }
    return currentPath;
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>폴더 선택</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* 경로 표시 */}
      <View style={styles.pathContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={styles.pathText}>{getDisplayPath()}</Text>
        </ScrollView>
      </View>

      {/* 네비게이션 버튼들 */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={goBack}
          disabled={currentPath === RNFS.ExternalStorageDirectoryPath && pathHistory.length === 0}
        >
          <Text style={styles.navButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={goToRoot}>
          <Text style={styles.navButtonText}>🏠 루트</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => setShowNewFolderModal(true)}
        >
          <Text style={styles.navButtonText}>+ 새폴더</Text>
        </TouchableOpacity>
      </View>

      {/* 폴더 목록 */}
      <ScrollView style={styles.folderList}>
        {loading ? (
          <Text style={styles.loadingText}>로딩 중...</Text>
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>폴더가 없습니다.</Text>
        ) : (
          items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.folderItem}
              onPress={() => navigateToFolder(item.path)}
            >
              <Text style={styles.folderIcon}>📁</Text>
              <View style={styles.folderInfo}>
                <Text style={styles.folderName}>{item.name}</Text>
                <Text style={styles.folderPath}>{item.path}</Text>
              </View>
              <Text style={styles.folderArrow}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 선택 버튼 */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.selectButton} 
          onPress={selectCurrentFolder}
        >
          <Text style={styles.selectButtonText}>
            현재 폴더 선택: {getDisplayPath()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 새 폴더 생성 모달 */}
      <Modal
        visible={showNewFolderModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새 폴더 생성</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="폴더 이름을 입력하세요"
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCreateButton} 
                onPress={createNewFolder}
              >
                <Text style={styles.modalCreateText}>생성</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  pathContainer: {
    backgroundColor: '#e9ecef',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  pathText: {
    fontSize: 12,
    color: '#495057',
    fontFamily: 'monospace',
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  navButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  navButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  folderList: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    color: '#6c757d',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#6c757d',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  folderIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  folderPath: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  folderArrow: {
    fontSize: 16,
    color: '#6c757d',
  },
  actionContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  selectButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#212529',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalCreateButton: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalCreateText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default FolderBrowser;