"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type ClassItem = { id: string; name: string; subject: string; grade: string };

export default function TeacherModulesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [modules, setModules] = useState<any[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [resources, setResources] = useState<any[]>([]);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [parentId, setParentId] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [resourceType, setResourceType] = useState<"file" | "link">("file");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  const loadModules = useCallback(
    async (nextClassId?: string) => {
      const target = nextClassId ?? classId;
      if (!target) return;
      const res = await fetch(`/api/teacher/modules?classId=${target}`);
      const data = await res.json();
      const list = data.data ?? [];
      setModules(list);
      if (list.length) {
        setModuleId(list[0].id);
      } else {
        setModuleId("");
      }
    },
    [classId]
  );

  const loadResources = useCallback(
    async (nextModuleId?: string) => {
      const target = nextModuleId ?? moduleId;
      if (!target) {
        setResources([]);
        return;
      }
      const res = await fetch(`/api/teacher/modules/${target}/resources`);
      const data = await res.json();
      setResources(data.data ?? []);
    },
    [moduleId]
  );

  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((res) => res.json())
      .then((data) => {
        const list = data.data ?? [];
        setClasses(list);
        if (list.length) {
          setClassId(list[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!classId) return;
    loadModules(classId);
  }, [classId, loadModules]);

  useEffect(() => {
    if (!moduleId) return;
    loadResources(moduleId);
  }, [moduleId, loadResources]);

  async function handleCreateModule(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/teacher/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        title: moduleTitle,
        description: moduleDesc,
        parentId: parentId || undefined,
        orderIndex
      })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "创建失败");
      return;
    }
    setMessage("模块创建成功");
    setModuleTitle("");
    setModuleDesc("");
    setParentId("");
    setOrderIndex(0);
    await loadModules(classId);
  }

  async function handleAddResource(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!moduleId) return;
    if (!resourceTitle) {
      setError("请填写资源标题");
      return;
    }
    if (resourceType === "file" && !resourceFile) {
      setError("请选择文件");
      return;
    }
    if (resourceType === "link" && !resourceUrl) {
      setError("请输入资源链接");
      return;
    }

    let payload: any = {
      title: resourceTitle,
      resourceType
    };

    if (resourceType === "link") {
      payload.linkUrl = resourceUrl;
    } else if (resourceFile) {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result?.toString() ?? "";
          const base64 = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("file read failed"));
        reader.readAsDataURL(resourceFile);
      });
      payload = {
        ...payload,
        fileName: resourceFile.name,
        mimeType: resourceFile.type || "application/octet-stream",
        size: resourceFile.size,
        contentBase64
      };
    }

    const res = await fetch(`/api/teacher/modules/${moduleId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "上传失败");
      return;
    }
    setMessage("资源已添加");
    setResourceTitle("");
    setResourceUrl("");
    setResourceFile(null);
    await loadResources(moduleId);
  }

  async function handleDeleteResource(resourceId: string) {
    const res = await fetch(`/api/teacher/modules/${moduleId}/resources`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId })
    });
    if (res.ok) {
      loadResources(moduleId);
    }
  }

  async function swapOrder(index: number, direction: "up" | "down") {
    if (moving) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= modules.length) return;
    const current = modules[index];
    const target = modules[nextIndex];
    setMoving(true);
    await fetch(`/api/teacher/modules/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIndex: target.orderIndex })
    });
    await fetch(`/api/teacher/modules/${target.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIndex: current.orderIndex })
    });
    await loadModules(classId);
    setMoving(false);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>课程模块管理</h2>
          <div className="section-sub">设置章节结构、上传课件并关联作业。</div>
        </div>
        <span className="chip">模块</span>
      </div>

      <Card title="选择班级" tag="班级">
        <label>
          <div className="section-title">班级</div>
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
      </Card>

      <Card title="新增模块" tag="章节">
        <div className="feature-card">
          <EduIcon name="book" />
          <p>创建章节/单元结构，支持层级模块。</p>
        </div>
        <form onSubmit={handleCreateModule} style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">模块标题</div>
            <input
              value={moduleTitle}
              onChange={(event) => setModuleTitle(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">模块说明（可选）</div>
            <textarea
              value={moduleDesc}
              onChange={(event) => setModuleDesc(event.target.value)}
              rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">上级模块（可选）</div>
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="">无</option>
              {modules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">排序序号</div>
            <input
              type="number"
              value={orderIndex}
              onChange={(event) => setOrderIndex(Number(event.target.value))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
          {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
          <button className="button primary" type="submit">
            创建模块
          </button>
        </form>
      </Card>

      <Card title="模块列表" tag="结构">
        {modules.length ? (
          <div className="grid" style={{ gap: 10 }}>
            {modules.map((item, index) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  {item.description || "暂无说明"}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>排序 {item.orderIndex}</div>
                <div className="cta-row" style={{ marginTop: 8 }}>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={moving || index === 0}
                    onClick={() => swapOrder(index, "up")}
                  >
                    上移
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={moving || index === modules.length - 1}
                    onClick={() => swapOrder(index, "down")}
                  >
                    下移
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无模块。</p>
        )}
      </Card>

      <Card title="模块资源" tag="课件">
        <div className="feature-card">
          <EduIcon name="board" />
          <p>上传课件或添加链接资源。</p>
        </div>
        <label>
          <div className="section-title">选择模块</div>
          <select
            value={moduleId}
            onChange={(event) => setModuleId(event.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          >
            <option value="">请选择模块</option>
            {modules.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        {moduleId ? (
          <form onSubmit={handleAddResource} style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <label>
              <div className="section-title">资源标题</div>
              <input
                value={resourceTitle}
                onChange={(event) => setResourceTitle(event.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">资源类型</div>
              <select
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value as "file" | "link")}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                <option value="file">上传文件</option>
                <option value="link">链接</option>
              </select>
            </label>
            {resourceType === "file" ? (
              <label>
                <div className="section-title">上传文件</div>
                <input type="file" onChange={(event) => setResourceFile(event.target.files?.[0] ?? null)} />
              </label>
            ) : (
              <label>
                <div className="section-title">资源链接</div>
                <input
                  value={resourceUrl}
                  onChange={(event) => setResourceUrl(event.target.value)}
                  placeholder="https://"
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
            )}
            <button className="button primary" type="submit">
              添加资源
            </button>
          </form>
        ) : (
          <p style={{ marginTop: 8 }}>请先选择模块。</p>
        )}
        <div style={{ marginTop: 12 }}>
          {resources.length ? (
            <div className="grid" style={{ gap: 10 }}>
              {resources.map((item) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    {item.resourceType === "link" ? item.linkUrl : item.fileName}
                  </div>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => handleDeleteResource(item.id)}
                    style={{ marginTop: 8 }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>暂无资源。</p>
          )}
        </div>
      </Card>
    </div>
  );
}
