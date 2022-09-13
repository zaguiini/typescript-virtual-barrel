import { value as DoesntHaveIndexvalue } from "./does-not-have-index/a";
import * as HasIndex from './has-index';
const DoesntHaveIndex = {
    value: DoesntHaveIndexvalue
};
console.log(DoesntHaveIndex.value + HasIndex.value);
