// Native Node execution: no fixture build or external TypeScript loader.
import { checkSubject, checkTypeScript } from './assertions.ts';
import { checkFormats } from './format-assertions.ts';

checkSubject();
checkTypeScript();
checkFormats();
