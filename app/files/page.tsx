"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

type CourseFile = {
  id: string;
  classId: string;
  folder?: string;
  title: string;
  resourceType: "file" | "link";
  fileName?: string;
  mimeType?: string;
  size?: number;
  contentBase64?: string;
  linkUrl?: string;
  createdAt: string;
};

export default function FilesPage() {
  const [role, setRole] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [folder, setFolder] = useState("");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [resourceType, setResourceType] = useState<"file" | "link">("file");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setRole(data?.user?.role ?? null));
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.data ?? []);
        if (data.data?.length) setClassId(data.data[0].id);
      });
  }, []);

  async function loadFiles(selectedClassId?: string) {
    if (!selectedClassId) return;
    const res = await fetch(`/api/files?classId=${selectedClassId}`);
    const data = await res.json();
    if (res.ok) setFiles(data.data ?? []);
  }

  useEffect(() => {
    if (classId) loadFiles(classId);
  }, [classId]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!classId) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    if (resourceType === "link") {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, folder, title, resourceType: "link", linkUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "保存失败");
      } else {
        setMessage("链接已添加");
        setTitle("");
        setLinkUrl("");
        loadFiles(classId);
      }
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("classId", classId);
    if (folder) formData.append("folder", folder);
    if (title) formData.append("title", title);
    const input = document.getElementById("fileInput") as HTMLInputElement | null;
    if (!input?.files?.length) {
      setError("请选择文件");
      setLoading(false);
      return;
    }
    Array.from(input.files).forEach((file) => formData.append("files", file));
    const res = await fetch("/api/files", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "上传失败");
    } else {
      setMessage("文件已上传");
      setTitle("");
      if (input) input.value = "";
      loadFiles(classId);
    }
    setLoading(false);
  }

  const grouped = files.reduce<Record<string, CourseFile[]>>((acc, file) => {
    const key = file.folder?.trim() || "默认";
    if (!acc[key]) acc[key] = [];
    acc[key].push(file);
    return acc;
  }, {});

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>课程文件中心</h2>
          <div className="section-sub">统一管理课程资料、课件与链接。</div>
        </div>
        <span className="chip">文件</span>
      </div>

      <Card title="班级选择" tag="课程">
        {classes.length ? (
          <label>
            <div className="section-title">选择班级</div>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>暂无班级。</p>
        )}
      </Card>

      {role === "teacher" ? (
        <Card title="上传资料 / 添加链接" tag="教师">
          <div className="feature-card">
            <EduIcon name="book" />
            <p>支持上传 PDF/图片，或添加外部链接。</p>
          </div>
          <form onSubmit={handleUpload} style={{ display: "grid", gap: 12 }}>
            <label>
              <div className="section-title">资料类型</div>
              <select
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value as "file" | "link")}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                <option value="file">上传文件</option>
                <option value="link">添加链接</option>
              </select>
            </label>
            <label>
              <div className="section-title">文件夹（可选）</div>
              <input
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
                placeholder="如：第一单元/课件"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">标题</div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="如：分数单元讲义"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            {resourceType === "link" ? (
              <label>
                <div className="section-title">链接地址</div>
                <input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://..."
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
            ) : (
              <label>
                <div className="section-title">选择文件</div>
                <input id="fileInput" type="file" multiple />
              </label>
            )}
            {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
            {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "提交中..." : resourceType === "link" ? "保存链接" : "上传文件"}
            </button>
          </form>
        </Card>
      ) : null}

      <Card title="资料列表" tag="资源">
        {files.length ? (
          <div className="grid" style={{ gap: 12 }}>
            {Object.entries(grouped).map(([folderName, items]) => (
              <div key={folderName} className="card">
                <div className="section-title">{folderName}</div>
                <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                  {items.map((item) => (
                    <div key={item.id} className="card">
                      <div className="section-title">{item.title}</div>
                      <div className="section-sub">
                        {new Date(item.createdAt).toLocaleDateString("zh-CN")} ·{" "}
                        {item.resourceType === "link" ? "链接" : item.mimeType ?? "文件"}
                      </div>
                      {item.resourceType === "link" && item.linkUrl ? (
                        <a href={item.linkUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                          打开链接
                        </a>
                      ) : item.contentBase64 && item.mimeType ? (
                        <a
                          href={`data:${item.mimeType};base64,${item.contentBase64}`}
                          download={item.fileName ?? item.title}
                          style={{ fontSize: 13 }}
                        >
                          下载文件
                        </a>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--ink-1)" }}>无可用资源</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无资料。</p>
        )}
      </Card>
    </div>
  );
}
