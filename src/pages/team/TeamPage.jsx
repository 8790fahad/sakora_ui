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
  });
  const [editing, setEditing] = useState(null);

  const { data: teamData } = useQuery("team", api.users.list);
  const { data: permData } = useQuery("permissions", api.users.permissions);

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
      });
    },
  });

  const updateUser = useMutation(
    ({ id, data }) => api.users.update(id, data),
    {
      onSuccess: () => {
        toast.success("Privileges updated");
        queryClient.invalidateQueries("team");
        setEditing(null);
      },
    }
  );

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
            createUser.mutate(form);
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
                    {user.email} · {user.role}
                  </p>
                </div>
                {user.role !== "owner" && (
                  <button
                    onClick={() =>
                      setEditing({
                        ...user,
                        permissions: user.permissionOverrides?.length
                          ? user.permissionOverrides
                          : user.permissions,
                      })
                    }
                    className="text-sm text-blue-600"
                  >
                    Edit privileges
                  </button>
                )}
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
            <Shield className="w-4 h-4" /> Privileges for {editing.firstName}
          </h2>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-4">
              <p className="text-xs uppercase text-slate-400 mb-2">{group}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {items.map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-sm">
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
                    role: editing.role,
                    permissions: editing.permissions,
                  },
                })
              }
              className="px-4 py-2 rounded-xl bg-blue-600 text-white"
            >
              Save privileges
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
