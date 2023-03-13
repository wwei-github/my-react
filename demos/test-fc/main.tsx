import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	console.log(1111);
	return (
		<div>
			<Child />
		</div>
	);
}
function Child() {
	return <div>App function 111</div>;
}
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
);
