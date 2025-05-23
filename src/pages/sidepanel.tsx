import { defineSidePanel } from 'wxt';
import './style.css';

export default defineSidePanel(() => {
    return (
        <>
            <div class="side-panel">
                <h1>My Side Panel</h1>
                <p>This is a simple side panel extension.</p>
            </div>
        </>
    );
});
