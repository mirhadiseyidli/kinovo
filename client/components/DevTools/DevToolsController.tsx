import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Modal, Alert } from 'react-native';
import { 
  devToolsManager, 
  getDevToolsConfig, 
  getDevToolsLogs, 
  getQueryInspector,
  exportDevToolsState,
  clearDevToolsLogs,
  performanceMonitor,
  toggleDevTools
} from '@/utils/devtools';

/**
 * DevTools Controller Component
 * 
 * This component provides a UI for managing React Query DevTools settings
 * and monitoring query performance in development builds.
 * 
 * Only available in __DEV__ builds.
 */

export const DevToolsController: React.FC = () => {
  const [config, setConfig] = useState(getDevToolsConfig());
  const [logs, setLogs] = useState(getDevToolsLogs());
  const [inspector, setInspector] = useState(getQueryInspector());
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Don't render in production
  if (!__DEV__) {
    return null;
  }

  useEffect(() => {
    // Set up periodic refresh
    const interval = setInterval(() => {
      setConfig(getDevToolsConfig());
      setLogs(getDevToolsLogs());
      setInspector(getQueryInspector());
    }, 1000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleToggleDevTools = async () => {
    await toggleDevTools();
    setConfig(getDevToolsConfig());
  };

  const handlePositionChange = async (position: 'top' | 'bottom' | 'left' | 'right') => {
    await devToolsManager.setPosition(position);
    setConfig(getDevToolsConfig());
  };

  const handleToggleMinimized = async () => {
    await devToolsManager.setMinimized(!config.minimized);
    setConfig(getDevToolsConfig());
  };

  const handleToggleNetworkLogs = async () => {
    await devToolsManager.toggleNetworkLogs();
    setConfig(getDevToolsConfig());
  };

  const handleToggleMutationLogs = async () => {
    await devToolsManager.toggleMutationLogs();
    setConfig(getDevToolsConfig());
  };

  const handleExportState = async () => {
    try {
      const state = exportDevToolsState();
      console.log('DevTools State Export:', state);
      Alert.alert('Export Complete', 'DevTools state has been logged to console');
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export DevTools state');
    }
  };

  const handleClearLogs = () => {
    clearDevToolsLogs();
    setLogs([]);
    Alert.alert('Logs Cleared', 'All DevTools logs have been cleared');
  };

  const handlePerformanceCheck = () => {
    performanceMonitor.logSlowQueries(500); // Log queries slower than 500ms
    performanceMonitor.logCacheMetrics();
    Alert.alert('Performance Check', 'Performance metrics have been logged to console');
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'query': return '#2196F3';
      case 'mutation': return '#FF9800';
      case 'network': return '#4CAF50';
      case 'cache': return '#9C27B0';
      default: return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'loading': return '#FF9800';
      default: return '#666';
    }
  };

  return (
    <>
      {/* Floating DevTools Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 100,
          right: 20,
          backgroundColor: '#2196F3',
          borderRadius: 25,
          width: 50,
          height: 50,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        }}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          🛠️
        </Text>
      </TouchableOpacity>

      {/* DevTools Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 20,
            width: '90%',
            maxHeight: '80%',
          }}>
            <ScrollView>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                React Query DevTools
              </Text>

              {/* Basic Controls */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                  Basic Controls
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>DevTools Enabled</Text>
                  <Switch
                    value={config.enabled}
                    onValueChange={handleToggleDevTools}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>Minimized</Text>
                  <Switch
                    value={config.minimized}
                    onValueChange={handleToggleMinimized}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>Network Logs</Text>
                  <Switch
                    value={config.showNetworkLogs}
                    onValueChange={handleToggleNetworkLogs}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text>Mutation Logs</Text>
                  <Switch
                    value={config.showMutationLogs}
                    onValueChange={handleToggleMutationLogs}
                  />
                </View>
              </View>

              {/* Position Controls */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                  Position
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['top', 'bottom', 'left', 'right'].map((position) => (
                    <TouchableOpacity
                      key={position}
                      style={{
                        backgroundColor: config.position === position ? '#2196F3' : '#f0f0f0',
                        padding: 8,
                        borderRadius: 4,
                        minWidth: 60,
                        alignItems: 'center',
                      }}
                      onPress={() => handlePositionChange(position as any)}
                    >
                      <Text style={{
                        color: config.position === position ? '#fff' : '#333',
                        fontSize: 12,
                      }}>
                        {position}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Inspector Stats */}
              {inspector && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                    Cache Stats
                  </Text>
                  <View style={{ backgroundColor: '#f5f5f5', padding: 10, borderRadius: 5 }}>
                    <Text style={{ fontSize: 14, marginBottom: 4 }}>
                      Queries: {inspector.queries.length}
                    </Text>
                    <Text style={{ fontSize: 14, marginBottom: 4 }}>
                      Mutations: {inspector.mutations.length}
                    </Text>
                    <Text style={{ fontSize: 14, marginBottom: 4 }}>
                      Cache Size: {inspector.cacheSize}
                    </Text>
                  </View>
                </View>
              )}

              {/* Recent Logs */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                  Recent Logs ({logs.length})
                </Text>
                <ScrollView 
                  style={{ maxHeight: 200, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 5 }}
                  nestedScrollEnabled={true}
                >
                  {logs.slice(-10).reverse().map((log, index) => (
                    <View key={index} style={{ marginBottom: 8, padding: 8, backgroundColor: '#fff', borderRadius: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ 
                          fontSize: 12, 
                          fontWeight: 'bold', 
                          color: getLogTypeColor(log.type) 
                        }}>
                          {log.type.toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#666' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      {log.queryKey && (
                        <Text style={{ fontSize: 10, color: '#666' }}>
                          {JSON.stringify(log.queryKey)}
                        </Text>
                      )}
                      {log.status && (
                        <Text style={{ 
                          fontSize: 10, 
                          color: getStatusColor(log.status),
                          fontWeight: 'bold'
                        }}>
                          {log.status}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#4CAF50',
                    padding: 10,
                    borderRadius: 5,
                    flex: 1,
                    minWidth: 100,
                    alignItems: 'center',
                  }}
                  onPress={handlePerformanceCheck}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    Performance Check
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#FF9800',
                    padding: 10,
                    borderRadius: 5,
                    flex: 1,
                    minWidth: 100,
                    alignItems: 'center',
                  }}
                  onPress={handleExportState}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    Export State
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#F44336',
                    padding: 10,
                    borderRadius: 5,
                    flex: 1,
                    minWidth: 100,
                    alignItems: 'center',
                  }}
                  onPress={handleClearLogs}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    Clear Logs
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#666',
                  padding: 15,
                  borderRadius: 5,
                  alignItems: 'center',
                }}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Development helper component that can be added to any screen
export const DevToolsDebugInfo: React.FC = () => {
  const [inspector, setInspector] = useState(getQueryInspector());

  useEffect(() => {
    const interval = setInterval(() => {
      setInspector(getQueryInspector());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!__DEV__) {
    return null;
  }

  return (
    <View style={{
      position: 'absolute',
      top: 50,
      left: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 10,
      borderRadius: 5,
      zIndex: 999,
    }}>
      <Text style={{ color: '#fff', fontSize: 12, marginBottom: 4 }}>
        DevTools Debug Info
      </Text>
      <Text style={{ color: '#fff', fontSize: 10 }}>
        Queries: {inspector?.queries.length || 0}
      </Text>
      <Text style={{ color: '#fff', fontSize: 10 }}>
        Mutations: {inspector?.mutations.length || 0}
      </Text>
      <Text style={{ color: '#fff', fontSize: 10 }}>
        Cache Size: {inspector?.cacheSize || 0}
      </Text>
    </View>
  );
};

export default DevToolsController;