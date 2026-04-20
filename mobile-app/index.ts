import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// und konfiguriert zusätzlich das Environment für Expo Go + Standalone-Builds.
registerRootComponent(App);
