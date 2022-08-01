"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPDATE_COMMENT_COMMAND = exports.SET_COMMENT_COMMAND = exports.$isCommentNode = exports.$createCommentNode = exports.CommentNode = void 0;
var lexical_1 = require("lexical");
var LexicalComposerContext_1 = require("@lexical/react/LexicalComposerContext");
var utils_1 = require("@lexical/utils");
var react_1 = require("react");
var selectElementText = function (el) {
    var range = document.createRange();
    range.selectNode(el);
    var sel = window.getSelection();
    sel === null || sel === void 0 ? void 0 : sel.removeAllRanges();
    sel === null || sel === void 0 ? void 0 : sel.addRange(range);
};
var CommentNode = /** @class */ (function (_super) {
    __extends(CommentNode, _super);
    function CommentNode(commentInstance, key) {
        var _this = _super.call(this, key) || this;
        _this.__commentInstance = commentInstance;
        return _this;
    }
    CommentNode.getType = function () {
        return 'comment';
    };
    CommentNode.clone = function (node) {
        return new CommentNode(node.__commentInstance, node.__key);
    };
    CommentNode.prototype.createDOM = function (config) {
        var element = document.createElement('span');
        element.setAttribute('data-comment-instance', JSON.stringify(this.__commentInstance));
        // element.addEventListener('click', (e) => e.target && selectElementText(e.target))
        (0, utils_1.addClassNamesToElement)(element, config.theme.comment);
        return element;
    };
    CommentNode.prototype.updateDOM = function (prevNode, dom, config) {
        var commentSpan = dom;
        var _a = [JSON.stringify(prevNode.__commentInstance), JSON.stringify(this.__commentInstance)], prevInstance = _a[0], currentInstance = _a[1];
        if (prevInstance !== currentInstance)
            commentSpan.setAttribute('data-comment-instance', currentInstance);
        return false;
    };
    CommentNode.importDOM = function () {
        return {
            span: function (node) { return ({
                conversion: convertCommentSpan,
                priority: 1,
            }); },
        };
    };
    CommentNode.prototype.getComment = function () {
        var self = this.getLatest();
        return self.__commentInstance;
    };
    CommentNode.prototype.setComment = function (commentInstance) {
        var writable = this.getWritable();
        writable.__commentInstance = commentInstance;
    };
    CommentNode.prototype.insertNewAfter = function (selection) {
        var _a;
        var element = this.getParentOrThrow().insertNewAfter(selection);
        if ((0, lexical_1.$isElementNode)(element)) {
            var commentNode = $createCommentNode(this.__commentInstance);
            (_a = element) === null || _a === void 0 ? void 0 : _a.append(commentNode);
            return commentNode;
        }
        return null;
    };
    CommentNode.prototype.canInsertTextBefore = function () {
        return false;
    };
    CommentNode.prototype.canInsertTextAfter = function () {
        return false;
    };
    CommentNode.prototype.canBeEmpty = function () {
        return false;
    };
    CommentNode.prototype.isInline = function () {
        return true;
    };
    return CommentNode;
}(lexical_1.ElementNode));
exports.CommentNode = CommentNode;
function convertCommentSpan(domNode) {
    var node = null;
    if (domNode instanceof HTMLSpanElement) {
        var commentInstance = domNode.getAttribute('data-comment-instance');
        if (commentInstance) {
            var jsonCommentInstance = JSON.parse(commentInstance);
            node = $createCommentNode(jsonCommentInstance);
        }
    }
    return { node: node };
}
function $createCommentNode(commentInstance) {
    return new CommentNode(commentInstance);
}
exports.$createCommentNode = $createCommentNode;
function $isCommentNode(node) {
    return node instanceof CommentNode;
}
exports.$isCommentNode = $isCommentNode;
var UPDATE_COMMENT_COMMAND = (0, lexical_1.createCommand)();
exports.UPDATE_COMMENT_COMMAND = UPDATE_COMMENT_COMMAND;
var SET_COMMENT_COMMAND = (0, lexical_1.createCommand)();
exports.SET_COMMENT_COMMAND = SET_COMMENT_COMMAND;
var EditorPriority = 0;
function setCommentInstance(commentInstance) {
    var selection = (0, lexical_1.$getSelection)();
    if (selection !== null)
        (0, lexical_1.$setSelection)(selection);
    var sel = (0, lexical_1.$getSelection)();
    // IT should look like this
    // TODO: figure out what could be solution of the problem that occur when sel.getTextContent() is included
    // if (sel !== null && sel.getTextContent()) {
    if (sel !== null) {
        var nodes = sel.extract();
        if (commentInstance === null) {
            // Remove CommentNodes
            nodes.forEach(function (node) {
                var parent = node.getParent();
                if (parent && $isCommentNode(parent)) {
                    var children = parent.getChildren();
                    for (var i = 0; i < children.length; i += 1)
                        parent.insertBefore(children[i]);
                    parent.remove();
                }
            });
        }
        else {
            // Add or merge CommentNodes
            if (nodes.length === 1) {
                var firstNode = nodes[0];
                // if the first node is a CommentNode or if its
                // parent is a CommentNode, we update the commentInstance.
                if ($isCommentNode(firstNode)) {
                    firstNode.setComment(commentInstance);
                    return;
                }
                else {
                    var parent = firstNode.getParent();
                    if (parent && $isCommentNode(parent)) {
                        // set parent to be the current CommentNode
                        // so that other nodes in the same parent
                        // aren't handled separately below.
                        parent.setComment(commentInstance);
                        return;
                    }
                }
            }
            var prevParent_1 = null;
            var commentNode_1 = null;
            nodes.forEach(function (node) {
                var parent = node.getParent();
                if (parent === commentNode_1 ||
                    parent === null ||
                    ((0, lexical_1.$isElementNode)(node) && !node.isInline())) {
                    return;
                }
                if (!parent.is(prevParent_1)) {
                    prevParent_1 = parent;
                    commentNode_1 = $createCommentNode(commentInstance);
                    if ($isCommentNode(parent)) {
                        if (node.getPreviousSibling() === null) {
                            parent.insertBefore(commentNode_1);
                        }
                        else {
                            parent.insertAfter(commentNode_1);
                        }
                    }
                    else {
                        node.insertBefore(commentNode_1);
                    }
                }
                if ($isCommentNode(node)) {
                    if (commentNode_1 !== null) {
                        var children = node.getChildren();
                        for (var i = 0; i < children.length; i++)
                            commentNode_1.append(children[i]);
                    }
                    node.remove();
                    return;
                }
                if (commentNode_1 !== null) {
                    commentNode_1.append(node);
                }
            });
        }
    }
}
function updateCommentInstance(commentInstance) {
    // const [editor] = useLexicalComposerContext()
    if (!commentInstance)
        return;
    var selection = (0, lexical_1.$getSelection)();
    if (selection !== null)
        (0, lexical_1.$setSelection)(selection);
    var sel = (0, lexical_1.$getSelection)();
    if (sel !== null) {
        var nodes = sel.extract();
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var node = nodes_1[_i];
            var parent = node.getParent();
            var commentNode = undefined;
            if (parent && $isCommentNode(parent))
                commentNode = parent;
            else if (node && $isCommentNode(node))
                commentNode = node;
            var foundNodeWithSameUuid = (commentNode === null || commentNode === void 0 ? void 0 : commentNode.__commentInstance.uuid) === commentInstance.uuid || false;
            if (foundNodeWithSameUuid)
                commentNode === null || commentNode === void 0 ? void 0 : commentNode.setComment(commentInstance);
        }
    }
}
function CommentPlugin() {
    var editor = (0, LexicalComposerContext_1.useLexicalComposerContext)()[0];
    (0, react_1.useEffect)(function () {
        if (!editor.hasNodes([CommentNode])) {
            throw new Error('CommentPlugin: CommentNode not registered on editor');
        }
    }, [editor]);
    (0, react_1.useEffect)(function () {
        return (0, utils_1.mergeRegister)(editor.registerCommand(SET_COMMENT_COMMAND, function (payload) {
            setCommentInstance(payload);
            return true;
        }, EditorPriority), editor.registerCommand(UPDATE_COMMENT_COMMAND, function (payload) {
            updateCommentInstance(payload);
            return true;
        }, EditorPriority));
    }, [editor]);
    return null;
}
exports.default = CommentPlugin;
