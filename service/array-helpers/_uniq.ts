export const useUniq = () => {
  Array.prototype.uniq = function() {
    return [...new Set(this)];
  };
};
