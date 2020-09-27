export const useIntersectBy = () => {
  Array.prototype.intersectBy = function(arr, iteratee) {
    const setA = new Set(this.map(iteratee));
    const setB = new Set(arr.map(iteratee));
    const intersectionList = new Set([...setA].filter((x) => setB.has(x)));
    return this.filter((x) => intersectionList.has(iteratee(x)));
  };
};
