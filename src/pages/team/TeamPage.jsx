import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Shield, Users } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

const TeamPage = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "staff",
    permissions: [],
    defaultPaymentMethod: "cash",
    defaultBankAccountId: "",
  });
  const [editing, setEditing] = useState(null);

  const { data: teamData } = useQuery("team", api.users.list);
  const { data: permData } = useQuery("permissions", api.users.permissions);
  const { data: settingsData } = useQuery("settings", api.settings.get, {
    refetchOnWindowFocus: false,
  });
  const bankAccounts =
    settingsData?.data?.bankAccounts ||
    settingsData?.data?.business?.bankAccounts ||
    [];

  const users = teamData?.data?.users || [];
  const catalog = permData?.data?.permissions || [];
  const grouped = useMemo(() => {
    return catalog.reduce((acc, item) => {
      acc[item.group] = acc[item.group] || [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }, [catalog]);

  const createUser = useMutation(api.users.create, {
    onSuccess: () => {
      toast.success("Team member added");
      queryClient.invalidateQueries("team");
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "staff",
        permissions: [],
        defaultPaymentMethod: "cash",
        defaultBankAccountId: "",
      });
    },
  });

  const updateUser = useMutation(
    ({ id, data }) => api.users.update(id, data),
    {
      onSuccess: () => {
        toast.success("Team member updated");
        queryClient.invalidateQueries("team");
        setEditing(null);
      },
    }
  );

  const paymentMethodOf = (user) =>
    user?.preferences?.pos?.defaultPaymentMethod === "bank" ? "bank" : "cash";

  const bankIdOf = (user) =>
    user?.preferences?.pos?.defaultBankAccountId || "";

  const bankLabel = (id) => {
    const bank = bankAccounts.find((item) => item.id === id);
    if (!bank) return null;
    return `${bank.bankName} · ${bank.accountNumber}`;
  };

  const togglePermission = (key, target, setter) => {
    const current = target.permissions || [];
    setter({
      ...target,
      permissions: current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team & privileges</h1>
        <p className="text-slate-500">
          Control what managers and staff can see and do.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const { defaultPaymentMethod, defaultBankAccountId, ...payload } =
              form;
            createUser.mutate({
              ...payload,
              preferences: {
                pos: {
                  defaultPaymentMethod,
                  defaultBankAccountId:
                    defaultPaymentMethod === "bank"
                      ? defaultBankAccountId || null
                      : null,
                },
              },
            });
          }}
          className="bg-white rounded-2xl border p-5 space-y-3"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Add team member
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="First name"
              className="border rounded-xl px-3 py-2"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <input
              required
              placeholder="Last name"
              className="border rounded-xl px-3 py-2"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <input
            required
            type="email"
            placeholder="Email"
            className="w-full border rounded-xl px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            placeholder="Temporary password"
            className="w-full border rounded-xl px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Default payment method
            </label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={form.defaultPaymentMethod}
              onChange={(e) =>
                setForm({ ...form, defaultPaymentMethod: e.target.value })
              }
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          {form.defaultPaymentMethod === "bank" && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Default bank account
              </label>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={form.defaultBankAccountId}
                onChange={(e) =>
                  setForm({ ...form, defaultBankAccountId: e.target.value })
                }
                required={bankAccounts.length > 0}
              >
                <option value="">
                  {bankAccounts.length === 0
                    ? "Add banks in Settings first"
                    : "Select bank"}
                </option>
                {bankAccounts.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bankName} · {bank.accountNumber}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Leave permissions empty to use the default role privileges.
          </p>
          <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white">
            Invite user
          </button>
        </form>

        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-2xl border p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {user.email} · {user.role} ·{" "}
                    {paymentMethodOf(user) === "bank" ? "Bank" : "Cash"} default
                    {paymentMethodOf(user) === "bank" &&
                    bankLabel(bankIdOf(user))
                      ? ` · ${bankLabel(bankIdOf(user))}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setEditing({
                      ...user,
                      defaultPaymentMethod: paymentMethodOf(user),
                      defaultBankAccountId: bankIdOf(user),
                      permissions: user.permissionOverrides?.length
                        ? user.permissionOverrides
                        : user.permissions,
                    })
                  }
                  className="text-sm text-blue-600"
                >
                  Edit
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(user.permissions || []).slice(0, 6).map((key) => (
                  <span
                    key={key}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100"
                  >
                    {key}
                  </span>
                ))}
                {(user.permissions || []).length > 6 && (
                  <span className="text-[11px] text-slate-400">
                    +{user.permissions.length - 6} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4" /> Edit {editing.firstName}
          </h2>
          <div className="mb-4 max-w-md space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Default payment method
              </label>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={editing.defaultPaymentMethod || "cash"}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    defaultPaymentMethod: e.target.value,
                  })
                }
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Pre-selected when this user opens Sales checkout.
              </p>
            </div>
            {editing.defaultPaymentMethod === "bank" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Default bank account
                </label>
                <select
                  className="w-full border rounded-xl px-3 py-2"
                  value={editing.defaultBankAccountId || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      defaultBankAccountId: e.target.value,
                    })
                  }
                >
                  <option value="">
                    {bankAccounts.length === 0
                      ? "Add banks in Settings first"
                      : "Use business default"}
                  </option>
                  {bankAccounts.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName} · {bank.accountNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {editing.role !== "owner" &&
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-4">
                <p className="text-xs uppercase text-slate-400 mb-2">{group}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {items.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={(editing.permissions || []).includes(item.key)}
                        onChange={() =>
                          togglePermission(item.key, editing, setEditing)
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          <div className="flex gap-3">
            <button
              onClick={() =>
                updateUser.mutate({
                  id: editing.id,
                  data: {
                    ...(editing.role !== "owner"
                      ? {
                          role: editing.role,
                          permissions: editing.permissions,
                        }
                      : {}),
                    defaultPaymentMethod: editing.defaultPaymentMethod,
                    defaultBankAccountId:
                      editing.defaultPaymentMethod === "bank"
                        ? editing.defaultBankAccountId || null
                        : null,
                  },
                })
              }
              className="px-4 py-2 rounded-xl bg-blue-600 text-white"
            >
              Save
            </button>
            <button onClick={() => setEditing(null)} className="px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
