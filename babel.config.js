// Configuração do Babel (Aula 14): o Jest precisa dela para transformar o
// código do app. É a mesma que o Metro já usava por padrão no Expo.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
