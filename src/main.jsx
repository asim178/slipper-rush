// The React app starts here
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// The fonts are bundled inside the app, so text looks right offline too
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
