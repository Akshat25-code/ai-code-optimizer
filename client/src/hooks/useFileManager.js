import { useState, useCallback } from 'react';

// Generate unique ID
const generateId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Default starter code for languages
const getDefaultCode = (language) => {
  const templates = {
    javascript: `// JavaScript Code
function helloWorld() {
  console.log("Hello, World!");
}

helloWorld();
`,
    typescript: `// TypeScript Code
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
`,
    python: `# Python Code
def hello_world():
    print("Hello, World!")

if __name__ == "__main__":
    hello_world()
`,
    java: `// Java Code
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
    cpp: `// C++ Code
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
    c: `// C Code
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
    csharp: `// C# Code
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
`,
    go: `// Go Code
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
    rust: `// Rust Code
fn main() {
    println!("Hello, World!");
}
`,
    php: `<?php
// PHP Code
echo "Hello, World!";
?>
`,
    ruby: `# Ruby Code
def hello_world
  puts "Hello, World!"
end

hello_world
`,
    swift: `// Swift Code
import Foundation

func helloWorld() {
    print("Hello, World!")
}

helloWorld()
`,
    kotlin: `// Kotlin Code
fun main() {
    println("Hello, World!")
}
`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>
`,
    css: `/* CSS Styles */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
}

h1 {
  color: #333;
}
`,
    json: `{
  "name": "example",
  "version": "1.0.0",
  "description": "Example JSON file"
}
`,
    sql: `-- SQL Query
SELECT * FROM users
WHERE active = true
ORDER BY created_at DESC;
`,
    plaintext: `Hello, World!
`
  };

  return templates[language] || '';
};

export const useFileManager = (initialLanguage = 'javascript') => {
  // Initialize with one default file
  const [files, setFiles] = useState(() => {
    const defaultFile = {
      id: generateId(),
      name: 'main.js',
      language: initialLanguage,
      content: getDefaultCode(initialLanguage),
      createdAt: new Date(),
      modifiedAt: new Date()
    };
    return [defaultFile];
  });
  
  const [activeFileId, setActiveFileId] = useState(() => files[0]?.id);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);

  // Get the currently active file
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // Create a new file
  const createFile = useCallback((fileData) => {
    const newFile = {
      id: generateId(),
      name: fileData.name,
      language: fileData.language,
      content: fileData.content || getDefaultCode(fileData.language),
      createdAt: new Date(),
      modifiedAt: new Date()
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
    return newFile;
  }, []);

  // Import file from local storage
  const importFile = useCallback((fileData) => {
    const newFile = {
      id: generateId(),
      name: fileData.name,
      language: fileData.language,
      content: fileData.content,
      createdAt: new Date(),
      modifiedAt: new Date(),
      imported: true
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
    return newFile;
  }, []);

  // Update file content
  const updateFileContent = useCallback((fileId, content) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, content, modifiedAt: new Date() }
        : file
    ));
  }, []);

  // Update active file content (shorthand)
  const updateActiveFileContent = useCallback((content) => {
    if (activeFileId) {
      updateFileContent(activeFileId, content);
    }
  }, [activeFileId, updateFileContent]);

  // Delete a file
  const deleteFile = useCallback((fileId) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId);
      // If deleting active file, switch to another file
      if (fileId === activeFileId && newFiles.length > 0) {
        setActiveFileId(newFiles[0].id);
      }
      return newFiles;
    });
  }, [activeFileId]);

  // Rename a file
  const renameFile = useCallback((fileId, newName) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, name: newName, modifiedAt: new Date() }
        : file
    ));
  }, []);

  // Update active file language
  const updateActiveFileLanguage = useCallback((language) => {
    if (activeFileId) {
      setFiles(prev => prev.map(file => 
        file.id === activeFileId 
          ? { ...file, language, modifiedAt: new Date() }
          : file
      ));
    }
  }, [activeFileId]);

  // Select a file
  const selectFile = useCallback((fileId) => {
    setActiveFileId(fileId);
  }, []);

  // Toggle explorer collapse state
  const toggleExplorerCollapse = useCallback(() => {
    setExplorerCollapsed(prev => !prev);
  }, []);

  // Download file
  const downloadFile = useCallback((fileId) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [files]);

  // Download active file
  const downloadActiveFile = useCallback(() => {
    if (activeFileId) {
      downloadFile(activeFileId);
    }
  }, [activeFileId, downloadFile]);

  return {
    // State
    files,
    activeFile,
    activeFileId,
    explorerCollapsed,
    
    // Actions
    createFile,
    importFile,
    deleteFile,
    renameFile,
    selectFile,
    updateFileContent,
    updateActiveFileContent,
    updateActiveFileLanguage,
    toggleExplorerCollapse,
    downloadFile,
    downloadActiveFile,
    
    // Current file helpers
    code: activeFile?.content || '',
    language: activeFile?.language || 'javascript',
    setCode: updateActiveFileContent,
    setLanguage: updateActiveFileLanguage
  };
};

export default useFileManager;
