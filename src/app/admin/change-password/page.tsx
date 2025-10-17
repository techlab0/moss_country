"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push("8文字以上である必要があります");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("大文字を含む必要があります");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("小文字を含む必要があります");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("数字を含む必要があります");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("特殊文字を含む必要があります");
    }
    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // バリデーション
    if (!currentPassword) {
      setError("現在のパスワードを入力してください");
      return;
    }

    if (!newPassword) {
      setError("新しいパスワードを入力してください");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("新しいパスワードが一致しません");
      return;
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setError("パスワード要件: " + passwordErrors.join(", "));
      return;
    }

    if (currentPassword === newPassword) {
      setError("新しいパスワードは現在のパスワードと異なる必要があります");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // 3秒後にダッシュボードにリダイレクト
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 3000);
      } else {
        setError(data.error || "パスワードの変更に失敗しました");
      }
    } catch (err) {
      setError("ネットワークエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              パスワードが変更されました
            </h2>
            <p className="text-sm text-gray-600">
              パスワードの変更が完了しました。3秒後にダッシュボードに戻ります。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">パスワード変更</h1>
          <p className="text-sm text-gray-600 mt-2">
            セキュリティのため、現在のパスワードと新しいパスワードを入力してください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              現在のパスワード
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-transparent"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              新しいパスワード
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-transparent"
              disabled={isLoading}
              required
            />
            <div className="mt-2 text-xs text-gray-600">
              <p>パスワード要件:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>8文字以上</li>
                <li>大文字・小文字・数字・特殊文字を含む</li>
              </ul>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              新しいパスワード（確認）
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-transparent"
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-moss-green text-white rounded-md hover:bg-moss-green/90 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "変更中..." : "変更する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

