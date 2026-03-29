import { useState } from 'react';
import {
  FiX, FiCopy, FiCheck, FiCode, FiServer, FiDatabase,
  FiUpload, FiDownload, FiTrash2, FiKey, FiGlobe,
  FiTerminal, FiHash
} from 'react-icons/fi';
import { FaPython, FaJs, FaPhp, FaJava } from 'react-icons/fa';
import { SiRuby, SiRust } from 'react-icons/si';

const ENDPOINT_CATEGORIES = [
  {
    id: 'storage',
    name: 'Storage API',
    icon: FiDatabase,
    color: 'blue',
    endpoints: [
      {
        method: 'POST',
        path: '/api/upload',
        name: 'Upload File',
        description: 'Upload a single file (max 50MB)',
        permission: 'upload'
      },
      {
        method: 'POST',
        path: '/api/upload-multiple',
        name: 'Upload Multiple',
        description: 'Upload up to 10 files at once',
        permission: 'upload'
      },
      {
        method: 'GET',
        path: '/api/files',
        name: 'List Files',
        description: 'Get all files for authenticated user',
        permission: 'read'
      },
      {
        method: 'GET',
        path: '/api/download/:filename',
        name: 'Download File',
        description: 'Download a specific file',
        permission: 'read'
      },
      {
        method: 'GET',
        path: '/api/file/:filename',
        name: 'Get File Metadata',
        description: 'Retrieve file information',
        permission: 'read'
      },
      {
        method: 'DELETE',
        path: '/api/delete/:filename',
        name: 'Delete File',
        description: 'Permanently delete a file',
        permission: 'delete'
      },
      {
        method: 'GET',
        path: '/api/storage-stats',
        name: 'Storage Stats',
        description: 'Get storage usage statistics',
        permission: 'read'
      }
    ]
  },
  {
    id: 'api-keys',
    name: 'API Keys',
    icon: FiKey,
    color: 'purple',
    endpoints: [
      {
        method: 'POST',
        path: '/api/api-keys',
        name: 'Generate Key',
        description: 'Create a new API key',
        permission: 'auth'
      },
      {
        method: 'GET',
        path: '/api/api-keys',
        name: 'List Keys',
        description: 'Get all API keys for user',
        permission: 'auth'
      },
      {
        method: 'GET',
        path: '/api/api-keys/:id',
        name: 'Get Key Info',
        description: 'Retrieve specific API key details',
        permission: 'auth'
      },
      {
        method: 'GET',
        path: '/api/api-keys/:id/usage',
        name: 'Key Usage',
        description: 'Get API key usage statistics',
        permission: 'auth'
      },
      {
        method: 'POST',
        path: '/api/api-keys/:id/revoke',
        name: 'Revoke Key',
        description: 'Revoke an API key',
        permission: 'auth'
      },
      {
        method: 'DELETE',
        path: '/api/api-keys/:id',
        name: 'Delete Key',
        description: 'Permanently delete an API key',
        permission: 'auth'
      },
      {
        method: 'GET',
        path: '/api/api-keys/permissions',
        name: 'Get Permissions',
        description: 'List available permission levels',
        permission: 'auth'
      }
    ]
  }
];

const LANGUAGES = {
  curl: {
    title: 'cURL',
    icon: FiGlobe,
    color: 'green',
    examples: {
      upload: `curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@document.pdf" \\
  http://localhost:3000/api/upload`,
      list: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  http://localhost:3000/api/files`,
      download: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  -O http://localhost:3000/api/download/file-id`,
      delete: `curl -X DELETE \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  http://localhost:3000/api/delete/file-id`,
      createKey: `curl -X POST \\
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My App","permissions":["read","upload"]}' \\
  http://localhost:3000/api/api-keys`
    }
  },
  javascript: {
    title: 'JavaScript',
    icon: FaJs,
    color: 'yellow',
    examples: {
      upload: `const API_KEY = "YOUR_API_KEY";

const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${API_KEY}\` },
  body: formData
});

const result = await response.json();
console.log('Uploaded:', result);`,
      list: `const API_KEY = "YOUR_API_KEY";

const response = await fetch('http://localhost:3000/api/files', {
  headers: { 'Authorization': \`Bearer \${API_KEY}\` }
});

const files = await response.json();
console.log('Files:', files);`,
      download: `const API_KEY = "YOUR_API_KEY";

const response = await fetch(
  \`http://localhost:3000/api/download/\${fileId}\`,
  { headers: { 'Authorization': \`Bearer \${API_KEY}\` } }
);

const blob = await response.blob();
const url = URL.createObjectURL(blob);`,
      delete: `const API_KEY = "YOUR_API_KEY";

await fetch(\`http://localhost:3000/api/delete/\${fileId}\`, {
  method: 'DELETE',
  headers: { 'Authorization': \`Bearer \${API_KEY}\` }
});`,
      createKey: `const FIREBASE_TOKEN = "YOUR_FIREBASE_TOKEN";

const response = await fetch('http://localhost:3000/api/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${FIREBASE_TOKEN}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My App',
    permissions: ['read', 'upload'],
    expiresAt: null
  })
});

const { apiKey } = await response.json();`
    }
  },
  python: {
    title: 'Python',
    icon: FaPython,
    color: 'blue',
    examples: {
      upload: `import requests

API_KEY = "YOUR_API_KEY"
headers = {'Authorization': f'Bearer {API_KEY}'}

with open('document.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:3000/api/upload',
        headers=headers,
        files={'file': f}
    )

result = response.json()
print('Uploaded:', result)`,
      list: `import requests

API_KEY = "YOUR_API_KEY"
headers = {'Authorization': f'Bearer {API_KEY}'}

response = requests.get(
    'http://localhost:3000/api/files',
    headers=headers
)

files = response.json()
print('Files:', files)`,
      download: `import requests

API_KEY = "YOUR_API_KEY"
headers = {'Authorization': f'Bearer {API_KEY}'}

response = requests.get(
    f'http://localhost:3000/api/download/{file_id}',
    headers=headers
)

with open('downloaded.pdf', 'wb') as f:
    f.write(response.content)`,
      delete: `import requests

API_KEY = "YOUR_API_KEY"
headers = {'Authorization': f'Bearer {API_KEY}'}

response = requests.delete(
    f'http://localhost:3000/api/delete/{file_id}',
    headers=headers
)`,
      createKey: `import requests

FIREBASE_TOKEN = "YOUR_FIREBASE_TOKEN"
headers = {'Authorization': f'Bearer {FIREBASE_TOKEN}'}

response = requests.post(
    'http://localhost:3000/api/api-keys',
    headers=headers,
    json={
        'name': 'My App',
        'permissions': ['read', 'upload']
    }
)

api_key = response.json()['apiKey']`
    }
  },
  php: {
    title: 'PHP',
    icon: FaPhp,
    color: 'purple',
    examples: {
      upload: `<?php
$apiKey = "YOUR_API_KEY";

$ch = curl_init('http://localhost:3000/api/upload');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey"
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'file' => new \\CURLFile('document.pdf')
]);

$response = curl_exec($ch);
$result = json_decode($response, true);
?>`,
      list: `<?php
$apiKey = "YOUR_API_KEY";

$response = file_get_contents(
    'http://localhost:3000/api/files',
    false,
    stream_context_create([
        'http' => ['header' => "Authorization: Bearer $apiKey"]
    ])
);

$files = json_decode($response, true);
?>`,
      download: `<?php
$apiKey = "YOUR_API_KEY";

$ch = curl_init("http://localhost:3000/api/download/$fileId");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$fileContent = curl_exec($ch);
file_put_contents('downloaded.pdf', $fileContent);
?>`,
      delete: `<?php
$apiKey = "YOUR_API_KEY";

$ch = curl_init("http://localhost:3000/api/delete/$fileId");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey"
]);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');

$response = curl_exec($ch);
?>`,
      createKey: `<?php
$firebaseToken = "YOUR_FIREBASE_TOKEN";

$data = json_encode([
    'name' => 'My App',
    'permissions' => ['read', 'upload']
]);

$ch = curl_init('http://localhost:3000/api/api-keys');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $firebaseToken",
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

$response = curl_exec($ch);
?>`
    }
  },
  go: {
    title: 'Go',
    icon: FiTerminal,
    color: 'cyan',
    examples: {
      upload: `package main

import (
    "bytes"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
)

func uploadFile(apiKey, filePath string) error {
    file, _ := os.Open(filePath)
    defer file.Close()

    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    part, _ := writer.CreateFormFile("file", filePath)
    io.Copy(part, file)
    writer.Close()

    req, _ := http.NewRequest("POST", 
        "http://localhost:3000/api/upload", body)
    req.Header.Set("Authorization", "Bearer "+apiKey)
    req.Header.Set("Content-Type", writer.FormDataContentType())

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    result, _ := io.ReadAll(resp.Body)
    fmt.Println(string(result))
    return nil
}`,
      list: `package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func listFiles(apiKey string) ([]File, error) {
    req, _ := http.NewRequest("GET", 
        "http://localhost:3000/api/files", nil)
    req.Header.Set("Authorization", "Bearer "+apiKey)

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    var files []File
    json.Unmarshal(body, &files)
    return files, nil
}`,
      download: `package main

import (
    "io"
    "net/http"
    "os"
)

func downloadFile(apiKey, fileId string) error {
    req, _ := http.NewRequest("GET", 
        fmt.Sprintf("http://localhost:3000/api/download/%s", fileId), 
        nil)
    req.Header.Set("Authorization", "Bearer "+apiKey)

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    out, _ := os.Create("downloaded.pdf")
    defer out.Close()

    io.Copy(out, resp.Body)
    return nil
}`,
      delete: `package main

import (
    "fmt"
    "net/http"
)

func deleteFile(apiKey, fileId string) error {
    req, _ := http.NewRequest("DELETE", 
        fmt.Sprintf("http://localhost:3000/api/delete/%s", fileId), 
        nil)
    req.Header.Set("Authorization", "Bearer "+apiKey)

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    return nil
}`,
      createKey: `package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func createApiKey(firebaseToken string) (string, error) {
    data := map[string]interface{}{
        "name": "My App",
        "permissions": []string{"read", "upload"},
    }
    body, _ := json.Marshal(data)

    req, _ := http.NewRequest("POST", 
        "http://localhost:3000/api/api-keys", 
        bytes.NewReader(body))
    req.Header.Set("Authorization", "Bearer "+firebaseToken)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result["apiKey"].(string), nil
}`
    }
  },
  java: {
    title: 'Java',
    icon: FaJava,
    color: 'red',
    examples: {
      upload: `import java.io.*;
import java.net.http.*;
import java.nio.file.*;

public class FileUpload {
    public static void uploadFile(String apiKey, String filePath) 
            throws Exception {
        var client = HttpClient.newHttpClient();
        
        var request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:3000/api/upload"))
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofFile(
                Path.of(filePath)))
            .build();
        
        var response = client.send(request, 
            HttpResponse.BodyHandlers.ofString());
        
        System.out.println(response.body());
    }
}`,
      list: `import java.net.http.*;
import java.net.URI;

public class ListFiles {
    public static String listFiles(String apiKey) throws Exception {
        var client = HttpClient.newHttpClient();
        
        var request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:3000/api/files"))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();
        
        var response = client.send(request, 
            HttpResponse.BodyHandlers.ofString());
        
        return response.body();
    }
}`,
      download: `import java.io.*;
import java.net.http.*;
import java.net.URI;

public class DownloadFile {
    public static void downloadFile(String apiKey, String fileId) 
            throws Exception {
        var client = HttpClient.newHttpClient();
        
        var request = HttpRequest.newBuilder()
            .uri(URI.create(
                "http://localhost:3000/api/download/" + fileId))
            .header("Authorization", "Bearer " + apiKey)
            .GET()
            .build();
        
        var response = client.send(request, 
            HttpResponse.BodyHandlers.ofByteArray());
        
        Files.write(Path.of("downloaded.pdf"), response.body());
    }
}`,
      delete: `import java.net.http.*;
import java.net.URI;

public class DeleteFile {
    public static void deleteFile(String apiKey, String fileId) 
            throws Exception {
        var client = HttpClient.newHttpClient();
        
        var request = HttpRequest.newBuilder()
            .uri(URI.create(
                "http://localhost:3000/api/delete/" + fileId))
            .header("Authorization", "Bearer " + apiKey)
            .DELETE()
            .build();
        
        client.send(request, HttpResponse.BodyHandlers.discarding());
    }
}`,
      createKey: `import java.net.http.*;
import java.net.URI;
import org.json.JSONObject;

public class CreateApiKey {
    public static String createApiKey(String firebaseToken) 
            throws Exception {
        var client = HttpClient.newHttpClient();
        
        var json = new JSONObject();
        json.put("name", "My App");
        json.put("permissions", 
            new String[]{"read", "upload"});
        
        var request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:3000/api/api-keys"))
            .header("Authorization", "Bearer " + firebaseToken)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(
                json.toString()))
            .build();
        
        var response = client.send(request, 
            HttpResponse.BodyHandlers.ofString());
        
        var result = new JSONObject(response.body());
        return result.getString("apiKey");
    }
}`
    }
  },
  ruby: {
    title: 'Ruby',
    icon: SiRuby,
    color: 'red',
    examples: {
      upload: `require 'net/http'
require 'uri'

def upload_file(api_key, file_path)
  uri = URI('http://localhost:3000/api/upload')
  
  Net::HTTP::Post.new(uri) do |req|
    req['Authorization'] = "Bearer #{api_key}"
    req.set_form(
      {'file' => File.open(file_path)},
      'multipart/form-data'
    )
    
    response = Net::HTTP.start(uri.hostname, uri.port) do |http|
      http.request(req)
    end
    
    puts response.body
  end
end`,
      list: `require 'net/http'
require 'json'

def list_files(api_key)
  uri = URI('http://localhost:3000/api/files')
  
  response = Net::HTTP.get(uri) do |req|
    req['Authorization'] = "Bearer #{api_key}"
  end
  
  JSON.parse(response.body)
end`,
      download: `require 'net/http'

def download_file(api_key, file_id)
  uri = URI("http://localhost:3000/api/download/#{file_id}")
  
  response = Net::HTTP.get(uri) do |req|
    req['Authorization'] = "Bearer #{api_key}"
  end
  
  File.write('downloaded.pdf', response.body)
end`,
      delete: `require 'net/http'

def delete_file(api_key, file_id)
  uri = URI("http://localhost:3000/api/delete/#{file_id}")
  
  Net::HTTP.delete(uri) do |req|
    req['Authorization'] = "Bearer #{api_key}"
  end
end`,
      createKey: `require 'net/http'
require 'json'

def create_api_key(firebase_token)
  uri = URI('http://localhost:3000/api/api-keys')
  
  response = Net::HTTP.post(
    uri,
    {name: 'My App', permissions: ['read', 'upload']}.to_json,
    'Authorization' => "Bearer #{firebase_token}",
    'Content-Type' => 'application/json'
  )
  
  JSON.parse(response.body)['apiKey']
end`
    }
  },
  csharp: {
    title: 'C#',
    icon: FiHash,
    color: 'purple',
    examples: {
      upload: `using System.Net.Http;
using System.IO;

public class FileUploader
{
    public async Task UploadFile(string apiKey, string filePath)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add(
            "Authorization", $"Bearer {apiKey}");
        
        using var formData = new MultipartFormDataContent();
        using var fileStream = File.OpenRead(filePath);
        var fileContent = new StreamContent(fileStream);
        formData.Add(fileContent, "file", Path.GetFileName(filePath));
        
        var response = await client.PostAsync(
            "http://localhost:3000/api/upload", formData);
        
        var result = await response.Content.ReadAsStringAsync();
    }
}`,
      list: `using System.Net.Http;
using System.Text.Json;

public class FileLister
{
    public async Task<List<File>> ListFiles(string apiKey)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add(
            "Authorization", $"Bearer {apiKey}");
        
        var response = await client.GetAsync(
            "http://localhost:3000/api/files");
        
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<File>>(json);
    }
}`,
      download: `using System.Net.Http;
using System.IO;

public class FileDownloader
{
    public async Task DownloadFile(string apiKey, string fileId)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add(
            "Authorization", $"Bearer {apiKey}");
        
        var data = await client.GetByteArrayAsync(
            $"http://localhost:3000/api/download/{fileId}");
        
        await File.WriteAllBytesAsync("downloaded.pdf", data);
    }
}`,
      delete: `using System.Net.Http;

public class FileDeleter
{
    public async Task DeleteFile(string apiKey, string fileId)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add(
            "Authorization", $"Bearer {apiKey}");
        
        await client.DeleteAsync(
            $"http://localhost:3000/api/delete/{fileId}");
    }
}`,
      createKey: `using System.Net.Http;
using System.Text;
using System.Text.Json;

public class ApiKeyCreator
{
    public async Task<string> CreateApiKey(string firebaseToken)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add(
            "Authorization", $"Bearer {firebaseToken}");
        
        var data = new
        {
            name = "My App",
            permissions = new[] { "read", "upload" }
        };
        
        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(
            json, Encoding.UTF8, "application/json");
        
        var response = await client.PostAsync(
            "http://localhost:3000/api/api-keys", content);
        
        var result = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(result);
        return doc.RootElement.GetProperty("apiKey").GetString();
    }
}`
    }
  },
  rust: {
    title: 'Rust',
    icon: SiRust,
    color: 'orange',
    examples: {
      upload: `use reqwest::multipart;
use std::fs::File;

async fn upload_file(
    api_key: &str, 
    file_path: &str
) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let file = File::open(file_path)?;
    let part = multipart::Part::reader(file)
        .file_name(file_path);
    
    let form = multipart::Form::new()
        .part("file", part);
    
    let response = client
        .post("http://localhost:3000/api/upload")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await?;
    
    println!("{}", response.text().await?);
    Ok(())
}`,
      list: `use reqwest;
use serde::Deserialize;

#[derive(Deserialize)]
struct File {
    id: String,
    name: String,
}

async fn list_files(
    api_key: &str
) -> Result<Vec<File>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let response = client
        .get("http://localhost:3000/api/files")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await?
        .json::<Vec<File>>()
        .await?;
    
    Ok(response)
}`,
      download: `use reqwest;
use tokio::io::AsyncWriteExt;

async fn download_file(
    api_key: &str, 
    file_id: &str
) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let response = client
        .get(format!(
            "http://localhost:3000/api/download/{}", 
            file_id
        ))
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await?;
    
    let bytes = response.bytes().await?;
    
    let mut file = tokio::fs::File::create("downloaded.pdf").await?;
    file.write_all(&bytes).await?;
    
    Ok(())
}`,
      delete: `use reqwest;

async fn delete_file(
    api_key: &str, 
    file_id: &str
) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    client
        .delete(format!(
            "http://localhost:3000/api/delete/{}", 
            file_id
        ))
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await?;
    
    Ok(())
}`,
      createKey: `use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct CreateKeyRequest {
    name: String,
    permissions: Vec<String>,
}

#[derive(Deserialize)]
struct CreateKeyResponse {
    apiKey: String,
}

async fn create_api_key(
    firebase_token: &str
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let request = CreateKeyRequest {
        name: "My App".to_string(),
        permissions: vec!["read".to_string(), "upload".to_string()],
    };
    
    let response = client
        .post("http://localhost:3000/api/api-keys")
        .header("Authorization", format!("Bearer {}", firebase_token))
        .json(&request)
        .send()
        .await?
        .json::<CreateKeyResponse>()
        .await?;
    
    Ok(response.apiKey)
}`
    }
  }
};

const METHOD_COLORS = {
  GET: 'bg-green-500/20 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  PATCH: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
};

function ApiIntegrationPreview({ onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('storage');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [selectedLang, setSelectedLang] = useState('curl');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExampleKey = (name) => name.toLowerCase().replace(/\s+/g, '');
  const currentCategory = ENDPOINT_CATEGORIES.find(c => c.id === selectedCategory);
  const currentLang = LANGUAGES[selectedLang];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl border border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <FiCode className="text-white text-xs" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-xs">API Integration</h2>
              <p className="text-[10px] text-gray-400">Quick start guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-all"
          >
            <FiX className="text-sm" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Category Tabs */}
          <div className="flex border-b border-white/10 bg-slate-800/50">
            {ENDPOINT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedEndpoint(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-500'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="text-xs" />
                  <span className="hidden sm:inline">{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Endpoint List - Compact */}
          <div className="flex-1 overflow-y-auto p-3">
            {!selectedEndpoint ? (
              <div className="grid gap-2">
                {currentCategory?.endpoints.map((endpoint, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEndpoint(endpoint)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedEndpoint === endpoint
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${METHOD_COLORS[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <span className="text-xs text-gray-300 font-mono truncate flex-1">
                        {endpoint.path}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">{endpoint.description}</div>
                  </button>
                ))}
              </div>
            ) : (
              /* Code Example View */
              <div className="flex flex-col h-full">
                {/* Endpoint Header */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setSelectedEndpoint(null)}
                    className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${METHOD_COLORS[selectedEndpoint.method]}`}>
                        {selectedEndpoint.method}
                      </span>
                      <code className="text-purple-300 text-xs font-mono truncate">
                        {selectedEndpoint.path}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Language Selector - Compact */}
                <div className="flex items-center gap-1 mb-3 pb-3 border-b border-white/10 overflow-x-auto">
                  {Object.entries(LANGUAGES).map(([key, lang]) => {
                    const Icon = lang.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedLang(key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                          selectedLang === key
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="text-xs" />
                        <span className="hidden xs:inline">{lang.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Code Editor - Compact */}
                <div className="flex-1 overflow-auto bg-[#1e1e2e] rounded-lg border border-white/10 relative">
                  <pre className="p-3 text-[11px] font-mono leading-5 text-gray-200">
                    <code>
                      {currentLang?.examples[getExampleKey(selectedEndpoint.name)] || '// No example available'}
                    </code>
                  </pre>
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => copyToClipboard(
                    currentLang?.examples[getExampleKey(selectedEndpoint.name)] || ''
                  )}
                  className={`mt-3 px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                    copied
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-purple-500 hover:bg-purple-600 text-white border border-purple-500/30'
                  }`}
                >
                  {copied ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/10 bg-slate-800/50">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <FiServer className="text-purple-400" />
                {ENDPOINT_CATEGORIES.reduce((acc, cat) => acc + cat.endpoints.length, 0)} endpoints
              </span>
              <span className="flex items-center gap-1">
                <FiCode className="text-green-400" />
                {Object.keys(LANGUAGES).length} languages
              </span>
            </div>
            <span className="font-mono">localhost:3000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiIntegrationPreview;
