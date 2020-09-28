/* eslint-disable max-depth */

function * stringInChunks (str, push, remaining) {
  if (str.length < remaining()) {
    yield * push(JSON.stringify(str));
  } else {
    push('"');
    while (str.length) {
      const substr = str.substr(0, Math.max(remaining(), 1000));
      str = str.substr(substr.length);
      yield * push(JSON.stringify(substr).slice(1, -1));
    }
    push('"');
  }
}

function fetchValue (obj, key, replacer, def) {
  let value = obj[key];
  if (replacer) {
    value = replacer.call(obj, key, value);
  }

  if (value !== undefined && value !== null && typeof value.toJSON === 'function') {
    value = value.toJSON(key);
  }

  switch (typeof value) {
    case 'number':
    case 'string':
    case 'object':
    case 'boolean':
      return value;
    default:
      return def;
  }
}

function * stringifyValue (value, replacer, leader, space, seen, push, remaining) {
  switch (typeof value) {
    case 'string':
      yield * stringInChunks(value, push, remaining);
      break;
    case 'boolean':
      push(value ? 'true' : 'false');
      break;
    case 'number':
      push(JSON.stringify(value));
      break;
    case 'object':
      if (value === null) {
        push('null');
      } else {
        if (seen.indexOf(value) !== -1) {
          throw new Error('Circular reference');
        }

        const nextLeader = leader + space;
        seen.push(value);
        if (Array.isArray(value)) {
          push('[');
          let i = 0;
          for (; i < value.length; ++i) {
            if (i !== 0) {
              push(',');
            }
            if (nextLeader) {
              push(nextLeader);
            }
            const v = fetchValue(value, i, replacer, null);
            yield * stringifyValue(v, replacer, nextLeader, space, seen, push, remaining);
          }
          if (i !== 0 && leader) {
            push(leader);
          }
          push(']');
        } else { /* object */
          let needsLeader = false;
          push('{');
          for (const key in Object.keys(value)) {
            const v = fetchValue(value, key, replacer, undefined);
            if (v === undefined) {
              continue;
            }

            if (needsLeader) {
              push(',');
            }

            if (nextLeader) {
              push(nextLeader);
            }

            push(JSON.stringify(key) + (space ? ': ' : ':'));
            yield * stringifyValue(v, replacer, nextLeader, space, seen, push, remaining);
            needsLeader = true;
          }
          if (needsLeader && leader) {
            push(leader);
          }
          push('}');
        }
        seen.pop();
        break;
      }
      break;
    default:
      push('null');
      break;
  }
}

const finishedGenerator = (function * () { })();

function * stringify (value, replacer, space, maxBuf = 500000) {
  if (Array.isArray(replacer)) {
    const repArr = replacer;
    replacer = function (key, value) {
      if (repArr.indexOf(key) === -1) {
        return undefined;
      }
      return value;
    };
  }

  if (typeof space === 'number') {
    space = ' '.repeat(Math.min(space, 10));
  }
  space = space || '';

  value = fetchValue({ '': value }, '', replacer, undefined);
  if (value === undefined) {
    return finishedGenerator;
  }

  const pieces = [];
  let len = 0;

  const consume = function * () {
    yield pieces.join('');
    pieces.length = [];
    len = 0;
  };

  const push = function (str) {
    if (str) {
      pieces.push(str);
      len += str.length;
    }
    if (len > maxBuf) {
      return consume();
    } else {
      return finishedGenerator;
    }
  };

  const remaining = () => maxBuf - len;

  yield * stringifyValue(value, replacer, space ? '\n' : '', space, [], push, remaining);
  if (pieces.length) {
    yield pieces.join('');
  }
}

module.exports = {
  stringify
};
