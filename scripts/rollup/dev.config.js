import reactDomConfig from './react-dom.config.js';
import reactConfig from './react.config.js';

export default () => [...reactDomConfig, ...reactConfig];
