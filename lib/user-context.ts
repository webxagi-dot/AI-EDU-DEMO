import { getCurrentUser, getUsers } from "./auth";

export function getStudentContext() {
  const user = getCurrentUser();
  if (!user) return null;
  if (user.role === "student") return user;
  if (user.role === "parent" && user.studentId) {
    const students = getUsers();
    const student = students.find((item) => item.id === user.studentId);
    if (!student) return null;
    const { password, ...safeStudent } = student;
    return safeStudent as typeof user;
  }
  return null;
}
