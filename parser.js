let currentToken = {};

let currentAttribute = {};

let stack = [{
  type: 'document',
  children: []
}];

let = currentTextNode = null;

const EOF = Symbol('EOF');

const emit = token => {
  console.log({
    token
  });
  const top = stack[stack.length - 1];
  if (token.type === 'startTag') {
    const element = {
      type: 'element',
      children: [],
      attributes: []
    };

    element.tagName = token.tagName;

    for (const p in token) {
      if (p !== 'type' && p !== 'tagName') {
        element.attributes.push({
          name: p,
          value: token[p]
        })
      }
    }

    top.children.push(element);

    if (!token.isSelfClosing) {
      stack.push(element);
    }

    currentTextNode = null;
  } else if (token.type === 'endTag') {
    if (top.tagName !== token.tagName) {
      throw new Error('Tags can\'t match!');
    } else {
      stack.pop();
    }
    currentTextNode = null;
  } else if (token.type === 'text') {
    if (currentTextNode === null) {
      currentTextNode = {
        type: 'text',
        content: ''
      };
      top.children.push(currentTextNode);
    }
    currentTextNode.content += token.content;
  }
}

const data = c => {
  if (c === '<') {
    return tagOpen;
  } else if (c == EOF) {
    emit({
      type: 'EOF'
    });
    return;
  } else {
    emit({
      type: 'text',
      content: c
    });
    return data;
  }
}

const tagOpen = c => {
  // <
  if (c === '/') {
    // <>
    return endTagOpen;
  } else if (c.match(/^[a-zA-Z1-9]$/)) {
    // <a
    currentToken = {
      type: 'startTag',
      tagName: ''
    }
    return tagName(c);
  } else {
    return;
  }
}

const endTagOpen = c => {
  // </
  if (c.match(/^[a-zA-Z1-9]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: ''
    }
    return tagName(c);
  } else if (c === '>') {

  } else if (c == EOF) {

  } else {

  }
}

const tagName = c => {
  // <
  // <a
  // </
  if (c.match(/^[\t\n\f ]$/)) {
    // <a (...)
    // </ (...)
    return beforeAttributeName;
  } else if (c === '/') {
    // <a /
    // <// 😑
    return selfClosingStartTag;
  } else if (c.match(/^[a-zA-Z1-9]$/)) {
    // <a
    // </a
    currentToken.tagName += c; // toLowerCase();
    return tagName;
  } else if (c === '>') {
    // <a>
    // </a>
    emit(currentToken);
    return data;
  } else {
    return tagName;
  }
}

const beforeAttributeName = c => {
  // <a (...)
  // <a href="#" (...)
  // <a href=a (...)
  if (c.match(/^[\t\n\f ]$/)) {
    // <a  (...)
    // <a href="#"  (...)
    // <a href=a  (...)
    return beforeAttributeName;
  } else if (c === '/' || c === '>' || c == EOF) {
    // <a /
    // <a >
    // <a href="#" /
    // <a href="#" >
    // <a href=a /
    // <a href=a >
    return afterAttributeName(c);
  } else if (c === '=') {

  } else {
    // <a h
    // <a href="#" c
    // <a href=a c
    currentAttribute = {
      name: '',
      value: ''
    }
    return attributeName(c);
  }
}

const attributeName = c => {
  // <a h
  // <a href="#" c
  // <a href=a c
  if (c.match(/^[\t\n\f ]$/) || c == '/' || c == '>' || c == EOF) {
    // <a h (...)
    // <a h/
    // <a h>
    // <a href="#" c (...)
    // <a href="#" c/
    // <a href="#" c>
    // <a href=a c (...)
    // <a href=a c/
    // <a href=a c>
    return afterAttributeName(c);
  } else if (c == '=') {
    // <a h=
    // <a href="#" c=
    // <a href=a c=
    return beforeAttributeValue;
  } else if (c == '\u0000') {

  } else if (c == '"' || c == "'" || c == '<') {

  } else {
    // <a hr
    // <a href="#" cl
    // <a href=a cl
    currentAttribute.name += c;
    return attributeName;
  }
}

const beforeAttributeValue = c => {
  // <a href=
  // <a href="#" class=
  // <a href=a class=
  if (c.match(/^[\t\n\f ]$/) || c == '/' || c == '>' || c == EOF) {
    // <a href= (...) 😑
    // <a href=/ 😑
    // <a href=> 😑
    // <a href="#" class= (...) 😑
    // <a href="#" class=/ 😑
    // <a href="#" class=> 😑
    // <a href=a class= (...) 😑
    // <a href=a class=/ 😑
    // <a href=a class=> 😑
    return beforeAttributeValue;
  } else if (c == '"') {
    // <a href="
    // <a href="#" class="
    // <a href=a class="
    return doubleQuotedAttributeValue;
  } else if (c == "'") {
    // <a href='
    // <a href="#" class='
    // <a href=a class='
    return singleQuotedAttributeValue;
  } else if (c == '>') {

  } else {
    // <a href=a
    // <a href="#" class=a
    // <a href=a class=a
    return UnquotedAttributeValue(c);
  }
}

const afterAttributeName = c => {
  // <a h
  // <a href="#" c
  // <a href=a c
  if (c.match(/^[\t\n\f ]$/)) {
    // <a h (...)
    // <a href="#" c (...)
    // <a href=a c (...)
    return attributeName;
  } else if (c === '/') {
    // <a h/
    // <a href="#" c/
    // <a href=a c/
    return selfClosingStartTag;
  } else if (c === '=') {
    // <a h=
    // <a href="#" c=
    // <a href=a c=
    return beforeAttributeValue;
  } else if (c === '>') {
    // <a h>
    // <a href="#" c>
    // <a href=a c>
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c == 'EOF') {

  } else {
    // <a hr
    // <a href="#" cl
    // <a href=a cl
    currentToken[currentAttribute.name] = currentAttribute.value;
    currentAttribute = {
      name: '',
      value: ''
    };
    return attributeName(c);
  }
}

const doubleQuotedAttributeValue = c => {
  // <a href="
  // <a href="#" class="
  // <a href=a class="
  if (c == '"') {
    // <a href="#"
    // <a href="#" class="a"
    // <a href=a class="a"
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c == '\u0000') {

  } else if (c == EOF) {

  } else {
    // <a href="
    // <a href="#" class="
    // <a href=a class="
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}

const singleQuotedAttributeValue = c => {
  // <a href='
  // <a href='#' class='
  // <a href=a class='
  if (c == "'") {
    // <a href='#'
    // <a href='#' class='a'
    // <a href=a class='a'
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c == '\u0000') {

  } else if (c == EOF) {

  } else {
    // <a href='
    // <a href='#' class='
    // <a href=a class='
    currentAttribute.value += c;
    return singleQuotedAttributeValue;
  }
}

const afterQuotedAttributeValue = c => {
  // <a href="#"
  // <a href="#" class="a"
  // <a href=a class="a"
  if (c.match(/^[\t\n\f ]$/)) {
    // <a href="#" (...)
    // <a href="#" class="a" (...)
    // <a href=a class="a" (...)
    return beforeAttributeName;
  } else if (c === '/') {
    // <a href="#"/
    // <a href="#" class="a"/
    // <a href=a class="a"/
    return selfClosingStartTag;
  } else if (c === '>') {
    // <a href="#">
    // <a href="#" class="a">
    // <a href=a class="a">
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === EOF) {

  } else {
    // <a href="#"t 😑
    // <a href="#" class="a"t 😑
    // <a href=a class="a"t 😑
    return beforeAttributeName(c);
  }
}

const UnquotedAttributeValue = c => {
  // <a href=a
  if (c.match(/^[\t\n\f ]$/)) {
    // <a href=a (...)
    currentToken[currentAttribute.name] = currentAttribute.value;
    return beforeAttributeName;
  } else if (c == '/') {
    // <a href=a/
    currentToken[currentAttribute.name] = currentAttribute.value;
    return selfClosingStartTag;
  } else if (c == '>') {
    // <a href=a>
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c == '\u0000') {

  } else if (c == '"' || c == "'" || c == '<' || c == '=' || c == '`') {

  } else if (c == EOF) {

  } else {
    // <a href=ab
    currentAttribute.value += c;
    return UnquotedAttributeValue;
  }
}

const selfClosingStartTag = c => {
  // <a /
  if (c === '>') {
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  } else if (c == 'EOF') {

  } else {
    // <a / h 😑
    return beforeAttributeName(c);
  }
}

module.exports.parseHTML = html => {
  console.log(` ------------- parseHTML ---------------`);
  console.log({
    html
  });
  let state = data;
  for (let c of html) {
    state = state(c);
  }
  state = state(EOF);
  console.log(` -------------  ---------------`);
  console.log({
    'stack': JSON.stringify(stack)
  });
}