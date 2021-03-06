import Paper, { Plugin, PluginCallbackParams } from '../paper';
import KeyCombination from '../key-combination';
import { isTextNode, deferFocus, setCursor } from '../node-utils';

import modalSource from './modal.html';

function isInsideLink(root: Node, node: Node) {
    let current: Node | null = node;

    while ((current = current && current.parentNode) !== root) {
        if (current instanceof Element && current.tagName === 'A') {
            return true;
        }
    }

    return false;
}

export default class Hyperlinker implements Plugin {
    constructor() {
        this.keyboardShortcut = new KeyCombination({
            ctrl: true,
            key: 'k',
        });
    }

    registerWith(paper: Paper) {
        this.container = paper.getContainer();
        paper.addKeyboardShortcut(
            this.keyboardShortcut,
            this.trigger.bind(this));

        return this.init();
    }

    init() {
        return new Promise<void>((resolve, reject) => {
            this.modalElement = window.document.createElement('div');
            this.modalElement.innerHTML = modalSource;
            this.initModal();
            resolve();
        });
    }

    initModal() {
        const modal = this.modalElement;
        const curtain = modal.querySelector('.curtain');

        const form = this.getForm();

        const cancel = form.querySelector('#cancel');
        if (!(cancel && curtain && cancel instanceof HTMLElement)) {
            throw new Error('Invalid pop-up');
        }

        form.onsubmit = this.onSubmit.bind(this);
        cancel.onclick = this.onCancel.bind(this);

        this.escListener = e => {
            if (e.key === 'Escape') {
                this.onCancel();
            }
        };

        this.curtainListener = e => {
            if (e.target === curtain) {
                this.onCancel();
            }
        };
    }

    getForm() : HTMLFormElement
    {
        const form = this.modalElement.querySelector('form');
        if (!(form && form instanceof HTMLElement)) {
            throw new Error('Form not found');
        }
        return form;
    }

    onCancel() {
        this.getForm().reset();
        this.hideModal();
    }

    getUrlEl() : HTMLInputElement {
        const urlEl = this.modalElement.querySelector('input[name=link_url]');
        if (!(urlEl && urlEl instanceof HTMLInputElement)) {
            throw new Error('Form URL input field invalid.');
        }
        return urlEl;
    }

    getTitleEl() : HTMLInputElement {
        const titleEl = this.modalElement.querySelector('input[name=link_title]');
        if (!(titleEl && titleEl instanceof HTMLInputElement)) {
            throw new Error('Form title input field invalid.');
        }
        return titleEl;
    }

    onSubmit(e: Event) {
        e.preventDefault();
        if (!this.linkRange) {
            throw new Error('linkRange not set during submit.');
        }
        const { startOffset, endOffset } = this.linkRange;
        const startContainer = this.linkRange.startContainer;

        if (startContainer instanceof Text) {
            const linkText = startContainer.splitText(startOffset);
            const trailingText = linkText.splitText(endOffset - startOffset);
            linkText.remove(); 

            const a = this.createLink(
                this.getTitleEl().value,
                this.getUrlEl().value);

            trailingText.before(a); 

            this.hideModal();
            setCursor(trailingText, 0);
        } else {
            console.error('Tried to turn non-text into hyperlink.');
        }
    }

    createLink(title: string, url: string) {
        const a = window.document.createElement('a');
        a.setAttribute('href', url);
        a.appendChild(document.createTextNode(title));
        return a;
    }

    showModal(selectedRange: Range) {
        window.addEventListener('keydown', this.escListener);
        window.addEventListener('click', this.curtainListener);
        document.body.appendChild(this.modalElement);
        this.linkRange = selectedRange;

        const title = selectedRange.toString();
        const titleEl = this.getTitleEl();

        if (title) {
            const urlEl = this.getUrlEl();
            titleEl.value = title;
            deferFocus(urlEl);
        } else {
            deferFocus(titleEl);
        }
    }

    hideModal() {
        this.getForm().reset();
        this.linkRange = null;
        window.removeEventListener('keydown', this.escListener);
        window.removeEventListener('click', this.curtainListener);
        this.modalElement.remove();
    }

    isModalShowing() {
        return this.modalElement.getRootNode() === document;
    }
    
    trigger({selectedRange, originalEvent}: PluginCallbackParams) {
        originalEvent.preventDefault();

        // If the modal is already showing ignore a trigger.
        if (this.isModalShowing()) {
            return;
        }

        const { startContainer, endContainer } = selectedRange;

        // Not handling links spanning more than one node for now.
        if (this.rangeInsideContainer(selectedRange) 
            && startContainer.isSameNode(endContainer)
            && isTextNode(startContainer)
            && ! isInsideLink(this.container, startContainer)) {

            this.showModal(selectedRange);
        } else {
            console.info('Selection was not valid for a hyperlink.', selectedRange);
        }
    }

    rangeInsideContainer(range: Range) {
       return this.container.contains(range.startContainer)
            && this.container.contains(range.endContainer);
    }

    keyboardShortcut: KeyCombination;
    container: Element;
    modalElement: Element;
    curtainListener: (e:Event) => void;
    escListener: (e: KeyboardEvent) => void;
    linkRange: Range | null;
}
