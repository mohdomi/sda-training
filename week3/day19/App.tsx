import React, {useEffect} from 'react';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {store} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import {offlineService} from './src/services/offlineService';

const App = () => {
  useEffect(() => {
    offlineService.syncOfflineData();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;
