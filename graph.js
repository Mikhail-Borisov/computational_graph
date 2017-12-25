// A little hack to get function arguments. Got basic idea here https://davidwalsh.name/javascript-arguments
function getArgs(func) {
    var args = func.toString().match(/\(([^)]*)\)/)[1];
    return args.split(',').map(function(arg) {
        return arg.replace(/\/\*.*\*\//, '').trim();
    }).filter(function(arg) {
        return arg;
    });
}

function thunk(f, name) {
    //console.log(this);
    let argNames = getArgs(f);
    //console.log(name);
    //console.log(argNames);
    return function() { let argValues = argNames.map((arg) => this[arg]());
                        let result=f(...argValues);
                        this[name] = function () {return result;};
                        return result;};
}

function lazy(graph) {
    let lazyGraph = {};
    for (let node in graph) {
        lazyGraph[node] = thunk.bind(graph)(graph[node], node);
    }
    return lazyGraph;
}


function dependencies (graph) {
    let dependencies = {};
    for (let node in graph) {
        dependencies[node] = getArgs(graph[node]);
    }
    return dependencies;
}

function isCyclicAtNode (graph, v, visited, stack) {
    visited[v] = true;
    stack[v] = true;
    let neighbours = graph[v];
    for (let n in neighbours) {
        let neighbour = neighbours[n];
        if (visited[neighbour] === false) {
            if (isCyclicAtNode(graph, neighbour, visited, stack) === true) {
                return true;
            }
        } else if (stack[neighbour] === true) {
            return true;
        }
    }
    stack[v] = false;
    return false;
}

function isCyclic (graph) {
    let literalGraph = dependencies(graph);
    let visited = Object.assign({}, literalGraph);
    let stack = Object.assign({}, literalGraph);
    // Initialize helper objects
    for (let node in graph) {
        visited[node] = false;
        stack[node] = false;
    }
    for (let node in graph) {
        if (visited[node] === false) {
            if (isCyclicAtNode(literalGraph, node, visited, stack) === true) {
                return true;nn
            }
        }
    }
    return false;
}

function lazyValue(x) {
    return function () { return x; };
}

function eagerCompile (graph) {
    if (isCyclic(graph)) {
        console.log("Cannot compile cyclic graph");
        return undefined;
    } else {
        let newGraph = Object.assign({}, graph);
        let keys = Object.keys(newGraph);
        return function (input) {
            // Complete graph with inputs
            for (let node in input) {
                newGraph[node] = lazyValue(input[node]);
            }
            let lazyGraph = lazy(newGraph);
            let result = {};
            keys.forEach( (node) => result[node] = lazyGraph[node]() );
            return result;
        };
    }
}

function lazyCompile (graph) {
    if (isCyclic(graph)) {
        console.log("Cannot compile cyclic graph");
        return undefined;
    } else {
        let newGraph = Object.assign({}, graph);
        return function (input) {
            // Complete graph with inputs
            for (let node in input) {
                newGraph[node] = lazyValue(input[node]);
            }
            let lazyGraph = lazy(newGraph);
            return function (node) {
                return lazyGraph[node]();
            };
        };
    }
}

// Define your graph and computations (functions) here
function count(xs) {
    return xs.length;
}

function sum(xs) {
    let s = 0;
    xs.forEach(function(x) {
        s += x;
    });
    return s;
}

function sumOfSquares(xs) {
    let s = 0;
    xs.forEach(function(x) {
        s += x*x;
    });
    return s;
}

var statsGraph = {n: (xs) => count(xs),
                  m: (xs, n) => (sum(xs) / n),
                  m2: (xs, n) => (sumOfSquares(xs) / n),
                  v: (m, m2) => (m2 - m*m)};

// Usage
// Eager version:
var stats = eagerCompile(statsGraph);
console.log( stats({xs: [1, 2, 3, 6]}) );

// Lazy version:
var lazyStats = lazyCompile(statsGraph);
console.log( lazyStats({xs: [1, 2, 3, 6]})("m2") );
