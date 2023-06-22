import { value as DoesntHaveIndexvalue } from "./does-not-have-index/a.js";
import * as HasIndex from './has-index/index.js';
const DoesntHaveIndex = {
    value: DoesntHaveIndexvalue
};
console.log(DoesntHaveIndex.value + HasIndex.value);
