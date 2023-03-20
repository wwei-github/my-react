import { ElementType } from './../../shared/ReactTypes';
import { Container } from 'hostConfig';
import { Props } from 'shared/ReactTypes';
export const elementPropsKey = '__props';
const validEventTypeList = ['click'];

type EventCallback = (e: Event) => void;
interface Paths {
	capture: EventCallback[];
	bubble: EventCallback[];
}
interface SyntheticEvent extends Event {
	__stopPropagation: boolean;
}
export interface DOMElement extends Element {
	[elementPropsKey]: Props;
}
export function updateFiberProps(node: DOMElement, props: Props): void {
	node[elementPropsKey] = props;
}

export function initEvent(container: Container, eventType: string) {
	// 判断是否支持事件
	if (!validEventTypeList.includes(eventType)) {
		console.warn(`当前不支持${eventType}事件`);
		return;
	}
	if (__DEV__) {
		console.log(`初始化事件：${eventType}`);
	}
	container.addEventListener(eventType, (e) => {
		dispatchEvent(container, eventType, e);
	});
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
	const targetElement = e.target;
	if (targetElement === null) {
		console.warn('事件不存在:', e);
		return;
	}
	// 1.收集目标元素到container的所有捕获和冒泡事件
	const { capture, bubble } = collectPath(
		targetElement as DOMElement,
		container,
		eventType
	);
	// 2.构建合成事件，用来模拟阻止冒泡
	const se = createSyntheticEvent(e);
	// 3.遍历捕获事件，
	triggerEventFlow(capture, se);
	// 判断是否阻止冒泡，
	if (!se.__stopPropagation) {
		// 遍历冒泡事件
		triggerEventFlow(bubble, se);
	}
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
	for (let i = 0; i < paths.length; i++) {
		const callback = paths[i];
		callback.call(null, se);
		if (se.__stopPropagation) {
			break;
		}
	}
}

function createSyntheticEvent(e: Event) {
	const syntheticEvent = e as SyntheticEvent;
	syntheticEvent.__stopPropagation = false;
	const originStopPropagation = e.stopPropagation;
	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true;
		if (originStopPropagation) {
			originStopPropagation();
		}
	};
	return syntheticEvent;
}

function getEventCallbackFromEventType(
	eventType: string
): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick']
	}[eventType];
}

function collectPath(
	targetElement: DOMElement,
	container: Container,
	elementType: ElementType
) {
	const paths: Paths = {
		capture: [], // 捕获事件
		bubble: [] // 冒泡事件
	};
	while (targetElement && targetElement !== container) {
		// 收集
		const elementProps = targetElement[elementPropsKey];
		if (elementProps) {
			const callbackNameList = getEventCallbackFromEventType(elementType);
			if (callbackNameList) {
				callbackNameList.forEach((callbackName, i) => {
					const eventCallback = elementProps[callbackName];
					if (eventCallback) {
						if (i === 0) {
							// 反向插入 [祖先捕获事件，父级捕获事件，目标元素捕获事件]
							paths.capture.unshift(eventCallback);
						} else {
							// [目标元素点击事件，父级点击事件，祖先点击事件]
							paths.bubble.push(eventCallback);
						}
					}
				});
			}
		}
		targetElement = targetElement.parentNode as DOMElement;
	}
	return paths;
}
