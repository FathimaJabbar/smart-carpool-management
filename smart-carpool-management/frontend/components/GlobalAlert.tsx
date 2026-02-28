import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

type AlertType = 'success' | 'error' | 'info';

interface AlertContextProps {
  showAlert: (title: string, message: string, type: AlertType, onConfirm?: () => void) => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AlertType>('info');
  const [onConfirm, setOnConfirm] = useState<(() => void) | undefined>();

  const showAlert = useCallback((title: string, message: string, type: AlertType, onConfirm?: () => void) => {
    setTitle(title);
    setMessage(message);
    setType(type);
    setOnConfirm(() => onConfirm);
    setVisible(true);
  }, []);

  const hideAlert = () => {
    setVisible(false);
    if (onConfirm) onConfirm();
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal isVisible={visible} onBackdropPress={() => setVisible(false)} backdropOpacity={0.7}>
        <BlurView intensity={120} tint="dark" style={styles.alertContainer}>
          <View style={styles.alertContent}>
            <View style={[styles.iconContainer, { backgroundColor: getTypeColor(type) + '20' }]}>
              <Ionicons name={getIconName(type)} size={32} color={getTypeColor(type)} />
            </View>
            <Text style={styles.alertTitle}>{title}</Text>
            <Text style={styles.alertMessage}>{message}</Text>
            <TouchableOpacity style={[styles.alertButton, { backgroundColor: getTypeColor(type) }]} onPress={hideAlert}>
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useGlobalAlert = (): AlertContextProps => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useGlobalAlert must be used within an AlertProvider');
  }
  return context;
};

const getIconName = (type: AlertType) => {
  switch (type) {
    case 'success':
      return 'checkmark-circle';
    case 'error':
      return 'alert-circle';
    case 'info':
      return 'information-circle';
    default:
      return 'information-circle';
  }
};

const getTypeColor = (type: AlertType) => {
  switch (type) {
    case 'success':
      return '#10B981';
    case 'error':
      return '#EF4444';
    case 'info':
      return '#3B82F6';
    default:
      return '#3B82F6';
  }
};

const styles = StyleSheet.create({
  alertContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  alertContent: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  alertButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});