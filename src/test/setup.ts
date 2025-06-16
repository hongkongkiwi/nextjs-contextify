// Test setup - Mock VS Code module for unit tests
import { Module } from 'module';
import * as vscode from './mocks/vscode';

// Store original require
const originalRequire = Module.prototype.require;

// Override require to mock 'vscode' module
Module.prototype.require = function (id: string) {
  if (id === 'vscode') {
    return vscode;
  }
  return originalRequire.call(this, id);
};

// Cleanup function to restore original require
export function cleanup() {
  Module.prototype.require = originalRequire;
}
