import { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, setNum] = useState(100);
	window.setNum = setNum;
	return <div>{num === 3 ? <Child /> : num}</div>;
}
function Child() {
	return <div>App function 111</div>;
}
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
