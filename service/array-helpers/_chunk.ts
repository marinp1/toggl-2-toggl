export const useChunk = () => {
  Array.prototype.chunk = function(chunkSize) {
    const numberOfChunks = Math.ceil(this.length / chunkSize);
    return [...new Array(numberOfChunks)].map((val, ind) =>
      this.slice(ind * chunkSize, (ind + 1) * chunkSize),
    );
  };
};
