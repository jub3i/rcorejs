//core
var core = (function() {
  var retObj = {};
  retObj.views = {};

  /**
   * EVENTS
   */

  retObj.events = {};

  /* ON */

  retObj.on = function(eventName, cb) {
    if (typeof retObj.events[eventName] === 'undefined') {
      retObj.events[eventName] = [];
    }
    retObj.events[eventName].push(cb);
  };

  /* OFF */

  retObj.off = function(eventName, cb) {
    var cbs = retObj.events[eventName];
    if (typeof retObj.events[eventName] === 'undefined') {
      return false;
    }

    var found = false;
    for (var i = 0; i < cbs.length; i++) {
      if (cb === cbs[i]) {
        cbs.splice(i, 1);
        found = true;
        break;
      }
    }
    return found;
  };

  /* EMIT */

  retObj.emit = function(eventName, data) {
    var events = retObj.events[eventName];
    if (typeof events === 'undefined' || events.length === 0) {
      return false;
    }

    data = (typeof data === 'undefined') ? null : data;

    for (var i = 0; i < retObj.events[eventName].length; i++) {
      retObj.events[eventName][i](data);
    }
    return true;
  };

  /**
   * DATA
   */

  retObj.db = {
    store: {}
  };

  retObj.db.get = function(keypath) {
    var pieces = keyPathToPieces(keypath);
    var intPos;
    var ref = retObj.db.store;

    for (var i = 0; i < pieces.length; i++) {
      intPos = parseInt(pieces[i].slice(1, pieces[i].length - 1));
      if (pieces[i][0] === '[') {
        if (typeof ref[intPos] === 'undefined') {
          return null;
        }
        ref = ref[intPos];
      } else {
        if (typeof ref[pieces[i]] === 'undefined') {
          return null;
        }
        ref = ref[pieces[i]];
      }
    }

    return ref;
  };

  retObj.forceKeyPathSet = function(keypath, data) {
    var ref = retObj.db.store;
    var pieces = keyPathToPieces(keypath);

    //create properties/arrays as needed to force the set of data
    var intPos;
    for (var i = 0; i < pieces.length; i++) {
      intPos = parseInt(pieces[i].slice(1, pieces[i].length - 1));

      if (i === pieces.length - 1) {
        if (pieces[i][0] === '[') {
          checkRefType(ref, 'array', keypath, intPos, data, pieces[i]);
          ref[intPos] = data;
        } else {
          checkRefType(ref, 'object', keypath, intPos, data, pieces[i]);
          ref[pieces[i]] = data;
        }

      } else if (typeof ref[pieces[i]] === 'undefined' &&
          typeof ref[intPos] === 'undefined'
      ) {
        if (pieces[i + 1][0] === '[') {

          if (pieces[i][0] === '[') {
            checkRefType(ref, 'array', keypath, intPos, data, pieces[i]);
            ref[intPos] = [];
            ref = ref[intPos];
          } else {
            checkRefType(ref, 'object', keypath, intPos, data, pieces[i]);
            ref[pieces[i]] = [];
            ref = ref[pieces[i]];
          }

        } else {
          if (pieces[i][0] === '[') {
            checkRefType(ref, 'array', keypath, intPos, data, pieces[i]);
            ref[intPos] = {};
            ref = ref[intPos];
          } else {
            checkRefType(ref, 'object', keypath, intPos, data, pieces[i]);
            ref[pieces[i]] = {};
            ref = ref[pieces[i]];
          }
        }

      } else {
        if (pieces[i][0] === '[') {
          checkRefType(ref, 'array', keypath, intPos, data, pieces[i]);
          ref = ref[intPos];
        } else {
          checkRefType(ref, 'object', keypath, intPos, data, pieces[i]);
          ref = ref[pieces[i]];
        }
      }
    }
  };

  function keyPathToPieces(keypath) {
    var lastSlicePos = 0;
    var isInsideSquareBrackets = false;
    var pieces = [];

    //parse keypath into pieces
    for (var i = 0; i < keypath.length; i++) {
      if (keypath[i] === '.') {
        if (keypath[i - 1] === ']') {
          lastSlicePos++;
        } else if (keypath[i - 1] === '.') {
          console.log('error: cannot have `.` preceded by a `.` at pos ' + i +
            ' in `' + keypath + '`');
          return null;
        } else if (i === keypath.length - 1) {
          console.log('error: cannot have `.` as last char in `' + keypath + '`');
          return null;
        } else if (i === 0) {
          console.log('error: cannot have `.` as first char in `' + keypath + '`');
          return null;
        } else {
          pieces.push(keypath.slice(lastSlicePos, i));
          lastSlicePos = i + 1;
        }
      } else if (keypath[i] === '[') {
        if (isInsideSquareBrackets) {
          console.log('error: unmatched array brackets `[` at pos ' + i +
            ' in `' + keypath + '`');
          return null;
        } else if (i === keypath.length - 1) {
          console.log('error: cannot have `[` as last char in `' + keypath + '`');
          return null;
        } else if (i === 0) {
          console.log('error: cannot have `[` as first char in `' + keypath + '`');
          return null;
        }

        isInsideSquareBrackets = true;
        if (keypath[i - 1] !== ']') {
          pieces.push(keypath.slice(lastSlicePos, i));
          lastSlicePos = i;
        }
      } else if (keypath[i] === ']') {
        if (!isInsideSquareBrackets) {
          console.log('error: unmatched array brackets `]` at pos ' + i +
            ' in `' + keypath + '`');
          return null;
        } else if (i - lastSlicePos <= 1) {
          console.log('error: cannot have empty `[]` at pos ' + i + ' in `' +
            keypath + '`');
          return null;
        }
        isInsideSquareBrackets = false;
        pieces.push(keypath.slice(lastSlicePos, i + 1));
        lastSlicePos = i + 1;
      } else if (i === keypath.length - 1) {
        if (isInsideSquareBrackets) {
          console.log('error: unmatched array brackets `]` at pos ' + i +
            ' in `' + keypath + '`');
          return null;
        }
        pieces.push(keypath.slice(lastSlicePos));
        lastSlicePos = i + 1;
      }
    }

    return pieces;
  }

  function checkRefType(ref, type, keypath, intPos, data, piece) {
    if (type === 'array') {
      if (!Array.isArray(ref)) {
        console.log('warning: setting index on an object (index:' + intPos +
          ') (data:' + data + ') (keypath: ' + keypath + ')');
      }
    } else if (type === 'object') {
      if (Array.isArray(ref)) {
        console.log('warning: setting property on an array (property:' + piece +
          ') (data:' + data + ') (keypath: ' + keypath + ')');
      }
    }
  }


  retObj.db.set = function(keypath, data) {
    var oldData = retObj.db.get(keypath);
    retObj.forceKeyPathSet(keypath, data);

    //TODO: if an entire array/object is updated, handleSetData/updateView
    //must update all children of that object/array ?
    //TODO: cascading changes to 'lower down in tree' keypaths

    handleSetData(keypath, data, oldData);
  };

  var handleSetData = function(keypath, data, oldData) {
    retObj.updateView(keypath, data, oldData, document);
  };

  retObj.updateView = function(keypath, data, oldData, cxt) {
    var elms = cxt.querySelectorAll('[data-keypath*="' + keypath + '"]');

    for (var i = 0; i < elms.length; i++) {
      var fullKeyPath = elms[i].getAttribute('data-keypath');
      var colonIndex = fullKeyPath.indexOf(':');

      if (colonIndex > 0) {
        var specifier = fullKeyPath.slice(0, colonIndex);
        if (specifier === 'class') {
          removeClassFromElement(elms[i], oldData);
          addClassToElement(elms[i], data);
        } else if (specifier === 'foreach') {
          //TODO: foreach loop, store the template inside for later reuse
          //loop over template inserting
          //possible sort middleware type fn
        } else {
          elms[i].setAttribute(specifier, data);
        }

      } else {
        elms[i].innerHTML = data;
      }
    }
  };

  /**
   * UTIL
   */

  //This code is jQuery's (http://stackoverflow.com/a/14105067)
  function addClassToElement(elem,value){
   var rspaces = /\s+/;
   var classNames = (value || "").split( rspaces );
   var className = " " + elem.className + " ",
   setClass = elem.className;
   for ( var c = 0, cl = classNames.length; c < cl; c++ ) {
    if ( className.indexOf( " " + classNames[c] + " " ) < 0 ) {
     setClass += " " + classNames[c];
    }
   }
   elem.className = setClass.replace(/^\s+|\s+$/g,'');//trim
  }

  //This code is jQuery's (http://stackoverflow.com/a/14105067)
  function removeClassFromElement(elem,value){
   var rspaces = /\s+/;
   var rclass = /[\n\t]/g;
   var classNames = (value || "").split( rspaces );
   var className = (" " + elem.className + " ").replace(rclass, " ");
   for ( var c = 0, cl = classNames.length; c < cl; c++ ) {
    className = className.replace(" " + classNames[c] + " ", " ");
   }
   elem.className = className.replace(/^\s+|\s+$/g,'');//trim
  }

  return retObj;
})();

//view
core.views.welcome = {
  template: function() {

    return '<p> Hi <span data-keypath="username"></span>' +
      ' <span data-keypath="lastname"></span>, how are you? </p>' +

      '<p>Long keypath value: <span data-keypath="stuff[2].weight[3][6][7].poop.boobs"></span></p>' +

      '<p> Car Weight: <b><span data-keypath="car.weight"></span></b>' +
      ' Car Length: <b><span data-keypath="car.length"></span></b></p>' +

      //TODO: implement attribute and class keypaths for below
      '<p data-keypath="data-pid:dogId" data-pid="7"> A paragraph with a keypath for an attribute </p>' +
      '<p data-keypath="class:activeClass" class="someOtherClass"> A paragraph with a keypath for an class element</p>' +

      '<div data-keypath="foreach:colors">' +
        '<p data-keypath="[i]"></p>' +
      '</div>';

      //'<table>' +
      //  '<tbody data-keypath="foreach:users">' +
      //    '<tr data-keypath="data-userid:[i].id">' +
      //      '<td data-keypath="[i]".name></td>' +
      //      '<td data-keypath="[i]".age></td>' +
      //    '</tr>' +
      //  '</tbody>' +
      //'</table>';
  },
  render: function(container) {

    //save the container element
    //this.container = container;

    container.innerHTML = this.template();

    //var elmsToUpdate = container.querySelectorAll('[data-keypath]');
    //for (var i = 0; i < elmsToUpdate.length; i++) {
    //  var elm = elmsToUpdate[i];
    //  var keypath = elm.getAttribute('data-keypath');
    //  elm.innerHTML = core.data.get(keypath);
    //}
  },
  container: null,
};

//controller
window.onload = function() {
  document.body.addEventListener(
    'click',
    function() {
      console.log(arguments);
    }
  );

  //render view into <body>
  core.views.welcome.render(document.body);

  //set some inital test data
  core.db.set('username', 'jubei_');
  core.db.set('lastname', 'st4r');

  core.db.set('car.weight', '1020kg');
  core.db.set('car.length', '3.4m');

  core.db.set('stuff[2].weight[3][6][7].poop.boobs', 'sex');
  core.db.set('stuff[2].weight[3][6][7].poop.banane', 'sex');
  core.db.set('stuff[2].race[3][6][3].poop.boobs', 'sex');
  core.db.set('stuff[2].race[3][6][7].poop.boobs', 'sex');
  //core.db.set('stuff.extras', 'sex');
  //core.db.set('stuff[2].race[3][6][7].poop.lame', 'sex');

  core.db.set('dogId', '1337');
  core.db.set('activeClass', 'info');

  core.db.set('colors', ['red', 'green', 'blue']);

  core.db.set('users', [
    { id: 138, name: 'john', age: 21 },
    { id: 28, name: 'sally', age: 19 },
    { id: 76, name: 'pete', age: 33 },
  ]);

  //test emit stuff
  core.on('boobs', function(data) {
    console.log('boobs triggered and ' + data.stuff);
  });

  core.emit('boobs', { stuff: 'stuff' });

  console.log(core.db.store);

  testAll();

};

//TODO: write tests into seperate file
function testAll() {
  var total = tests.length;
  var passed = 0;
  var failed = 0;

  for (var i = 0; i < total; i++) {
    if (tests[i]()) {
      console.log('PASSED: ' + tests[i].name);
      passed++;
    } else {
      console.log('FAILED: ' + tests[i].name);
      failed++;
    }
  }

  if (total === passed) {
    console.log('RESULTS: PASSED (' + passed + '/' + total + ')');
  } else {
    console.log('RESULTS: FAILED (' + failed + '/' + total + '), ' +
      'PASSED: (' + passed + '/' + total + ')');
  }
}

var tests = [
  testGet,
  testForceKeyPathSet
];

function testGet() {
  return true;
}

function testForceKeyPathSet() {
  return true;
}
