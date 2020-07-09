import { render as Button } from 'test-components/button';

import { classes } from './comp.st.css';

export function Comp() {
    const comp = document.createElement('div');
    comp.classList.add(classes.root);
    comp.appendChild(Button());
    return comp;
}
