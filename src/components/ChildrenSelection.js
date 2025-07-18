import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import KidsNoteAPI from '../services/KidsNoteAPI';

const ChildrenSelection = ({ onChildrenSelected }) => {
  const [children, setChildren] = useState([]);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const result = await KidsNoteAPI.getChildren();
      
      if (result.success) {
        setChildren(result.children);
      } else {
        Alert.alert('오류', result.error);
      }
    } catch (error) {
      Alert.alert('오류', `자녀 정보를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChildSelection = (childId) => {
    setSelectedChildren(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      } else {
        return [...prev, childId];
      }
    });
  };


  const handleNext = () => {
    if (selectedChildren.length === 0) {
      Alert.alert('알림', '다운로드할 자녀를 선택해주세요.');
      return;
    }

    // 권한 체크 없이 바로 진행
    onChildrenSelected(selectedChildren);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>자녀 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>자녀 선택</Text>
      <Text style={styles.subtitle}>다운로드할 자녀를 선택하세요</Text>

      <ScrollView style={styles.childrenList}>
        {children.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={[
              styles.childItem,
              selectedChildren.includes(child.id) && styles.selectedChildItem
            ]}
            onPress={() => toggleChildSelection(child.id)}
          >
            <View style={styles.childInfo}>
              <Text style={[
                styles.childName,
                selectedChildren.includes(child.id) && styles.selectedChildName
              ]}>
                {child.name}
              </Text>
              <Text style={[
                styles.childId,
                selectedChildren.includes(child.id) && styles.selectedChildId
              ]}>
                ID: {child.id}
              </Text>
            </View>
            <View style={[
              styles.checkbox,
              selectedChildren.includes(child.id) && styles.checkedBox
            ]}>
              {selectedChildren.includes(child.id) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Text style={styles.selectionInfo}>
          {selectedChildren.length}명의 자녀가 선택됨
        </Text>
        <TouchableOpacity
          style={[
            styles.nextButton,
            selectedChildren.length === 0 && styles.disabledButton
          ]}
          onPress={handleNext}
          disabled={selectedChildren.length === 0}
        >
          <Text style={[
            styles.nextButtonText,
            selectedChildren.length === 0 && styles.disabledButtonText
          ]}>
            다음
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  childrenList: {
    flex: 1,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedChildItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  selectedChildName: {
    color: '#007AFF',
  },
  childId: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  selectedChildId: {
    color: '#0066cc',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    paddingTop: 20,
  },
  selectionInfo: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#999',
  },
});

export default ChildrenSelection;