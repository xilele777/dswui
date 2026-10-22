const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('.workbuddy/reference-20261022/main.js', 'utf8');
const start = source.indexOf('47843(e,t,n){');
const end = source.indexOf('},', source.indexOf('let ey=', start));
// The icon module is self-contained and ends at the next webpack module boundary.
const next = /\},\d+\(e(?:,t(?:,n)?)?\)\{/.exec(source.slice(start));
const moduleBody = source.slice(start + '47843(e,t,n)'.length, start + next.index + 1);
const jsx = (tag, props) => ({ tag, props });
const moduleObject = { exports: {} };
const requireStub = () => ({ jsx, jsxs: jsx });
requireStub.d = (target, definitions) => Object.entries(definitions).forEach(([key, getter]) => Object.defineProperty(target, key, { get: getter }));
vm.runInNewContext('(function(e,t,n)' + moduleBody + ')', {})(moduleObject, moduleObject.exports, requireStub);
const render = (node) => {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(render).join('');
  const {children, ...attrs} = node.props;
  const attributes = Object.entries(attrs).map(([key,value]) => ` ${key === 'viewBox' ? key : key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${value}"`).join('');
  return `<${node.tag}${attributes}>${render(children)}</${node.tag}>`;
};
for (const [name, key] of Object.entries({search:'FG', sidebar:'ee', thinking:'di', close:'Q0', more:'sB', arrow:'NH', paperclip:'jL', multi:'pA'})) {
  fs.writeFileSync(`src/assets/icon-${name}.svg`, render(moduleObject.exports[key]()));
  console.log(name, key);
}

for (const key of Object.getOwnPropertyNames(moduleObject.exports)) { const svg=render(moduleObject.exports[key]()); if(['M8.3125','M5.5498','translate(0.9 1.4)'].some(v=>svg.includes(v))) console.log(key,svg.slice(0,250)); }
