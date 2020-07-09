import { label } from 'test-components';

import { classes } from './anther-comp.st.css';

export function AntherComp() {
    const comp = document.createElement('div');
    comp.classList.add(classes.root);
    comp.appendChild(label.render());
    return comp;
}
