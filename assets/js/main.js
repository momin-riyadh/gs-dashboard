import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
// Bootstrap's CSS is vendored locally (assets/vendor/bootstrap/bootstrap.css)
// instead of imported from the npm package, so it can be edited/customized
// directly. Bootstrap's JS still comes from the package (behaviour only).
import '../vendor/bootstrap/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../css/custom.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { initGenuityAdmin } from './hydrate.js';

initGenuityAdmin();
