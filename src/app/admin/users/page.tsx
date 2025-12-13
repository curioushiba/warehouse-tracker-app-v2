"use client";

import * as React from "react";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Users,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  IconButton,
  SearchInput,
  Avatar,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Switch,
} from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";
import type { Profile, UserRole } from "@/lib/supabase/types";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  type CreateUserInput,
} from "@/lib/actions/users";

type StatusFilter = "all" | "active" | "inactive";

interface UserFormData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

const initialFormData: UserFormData = {
  username: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "employee",
};

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i} variant="elevated">
          <CardBody className="p-5">
            <div className="flex flex-col items-center text-center animate-pulse">
              <div className="w-12 h-12 rounded-full bg-neutral-200 mb-3" />
              <div className="h-4 w-24 bg-neutral-200 rounded mb-2" />
              <div className="h-3 w-32 bg-neutral-100 rounded mb-3" />
              <div className="h-5 w-16 bg-neutral-100 rounded" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default function UsersPage() {
  // State for users list
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<Profile | null>(null);

  // Form state
  const [formData, setFormData] = React.useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = React.useState<Partial<UserFormData>>({});
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  // Fetch users
  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getUsers();

    if (result.success) {
      setUsers(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Helper to get display name
  const getDisplayName = (user: Profile) => {
    if (user.name) return user.name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return user.username;
  };

  // Filter users based on search and status (only show employees, not admins)
  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      // Only show employee accounts
      if (user.role === 'admin') return false;

      const displayName = getDisplayName(user);
      // Search filter
      const matchesSearch =
        !searchQuery ||
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  // Count employees by status (exclude admins)
  const employeesOnly = users.filter((u) => u.role === 'employee');
  const activeCount = employeesOnly.filter((u) => u.is_active).length;
  const inactiveCount = employeesOnly.filter((u) => !u.is_active).length;

  // Form validation
  const validateForm = (isEdit: boolean = false): boolean => {
    const errors: Partial<UserFormData> = {};

    if (!isEdit && !formData.username.trim()) {
      errors.username = "Username is required";
    }

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    // Email is optional for employees, but validate format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    // Password only required for new users
    if (!isEdit && !formData.password) {
      errors.password = "Password is required";
    } else if (formData.password && formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add user
  const handleAddUser = async () => {
    if (!validateForm(false)) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const input: CreateUserInput = {
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      password: formData.password,
      role: formData.role,
    };

    const result = await createUser(input);

    if (result.success) {
      setUsers([result.data, ...users]);
      setIsAddModalOpen(false);
      setFormData(initialFormData);
      setFormErrors({});
    } else {
      setSubmitError(result.error);
    }

    setIsSubmitting(false);
  };

  // Handle edit user
  const handleEditUser = async () => {
    if (!validateForm(true) || !selectedUser) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await updateUser(selectedUser.id, {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email || null,
    });

    if (result.success) {
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id ? result.data : user
        )
      );
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setFormData(initialFormData);
      setFormErrors({});
    } else {
      setSubmitError(result.error);
    }

    setIsSubmitting(false);
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await deleteUser(selectedUser.id);

    if (result.success) {
      setUsers(users.filter((user) => user.id !== selectedUser.id));
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } else {
      setSubmitError(result.error);
    }

    setIsSubmitting(false);
  };

  // Handle toggle status
  const handleToggleStatus = async (user: Profile) => {
    setOpenMenuId(null);

    const result = user.is_active
      ? await deactivateUser(user.id)
      : await activateUser(user.id);

    if (result.success) {
      setUsers(
        users.map((u) =>
          u.id === user.id ? result.data : u
        )
      );
    } else {
      setError(result.error);
    }
  };

  // Open edit modal with user data
  const openEditModal = (user: Profile) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      email: user.email || "",
      password: "",
      role: user.role,
    });
    setFormErrors({});
    setSubmitError(null);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  // Open delete modal
  const openDeleteModal = (user: Profile) => {
    setSelectedUser(user);
    setSubmitError(null);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  // Error state
  if (error && !isLoading && users.length === 0) {
    return (
      <div className="space-y-6">
        <Card variant="outline" className="py-12">
          <CardBody className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-error mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Failed to load users
            </h3>
            <p className="text-foreground-muted mb-4">{error}</p>
            <Button
              variant="primary"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchUsers}
            >
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search employees by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <Button
          variant="cta"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setFormData(initialFormData);
            setFormErrors({});
            setSubmitError(null);
            setShowPassword(false);
            setIsAddModalOpen(true);
          }}
        >
          Add Employee
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === "all" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          All ({employeesOnly.length})
        </Button>
        <Button
          variant={statusFilter === "active" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setStatusFilter("active")}
        >
          Active ({activeCount})
        </Button>
        <Button
          variant={statusFilter === "inactive" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setStatusFilter("inactive")}
        >
          Inactive ({inactiveCount})
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredUsers.length === 0 ? (
        /* Empty State */
        <Card variant="outline" className="py-12">
          <CardBody className="text-center">
            <Users className="w-12 h-12 mx-auto text-foreground-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No employees found
            </h3>
            <p className="text-foreground-muted mb-4">
              {searchQuery
                ? "Try adjusting your search query"
                : "Add your first employee to get started"}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddModalOpen(true)}
              >
                Add Employee
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        /* Employees Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map((user) => (
            <Card
              key={user.id}
              variant="elevated"
              className={`relative ${!user.is_active ? "opacity-60" : ""}`}
            >
              <CardBody className="p-5">
                {/* Menu Button */}
                <div className="absolute top-3 right-3">
                  <div className="relative">
                    <IconButton
                      icon={<MoreVertical className="w-4 h-4" />}
                      aria-label="User actions"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === user.id ? null : user.id);
                      }}
                    />

                    {/* Dropdown Menu */}
                    {openMenuId === user.id && (
                      <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-border py-1 z-10">
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                          onClick={() => openEditModal(user)}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="w-4 h-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 text-error"
                          onClick={() => openDeleteModal(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex flex-col items-center text-center">
                  <Avatar name={getDisplayName(user)} size="lg" className="mb-3" />
                  <h3 className="font-medium text-foreground">{getDisplayName(user)}</h3>
                  <p className="text-xs text-foreground-placeholder mb-1">@{user.username}</p>
                  {user.email && (
                    <p className="text-sm text-foreground-muted mb-3">
                      {user.email}
                    </p>
                  )}

                  {/* Status Toggle */}
                  <div className="flex items-center gap-2 mt-1">
                    <Switch
                      isChecked={user.is_active}
                      onChange={() => handleToggleStatus(user)}
                      size="sm"
                      colorScheme="success"
                      aria-label={`Toggle ${getDisplayName(user)} status`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        user.is_active ? "text-success" : "text-foreground-muted"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Last Login */}
                  {user.last_login_at && (
                    <p className="text-xs text-foreground-placeholder mt-3">
                      Last login: {formatRelativeTime(user.last_login_at)}
                    </p>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        size="md"
      >
        <ModalHeader showCloseButton onClose={() => setIsAddModalOpen(false)}>
          Add Employee
        </ModalHeader>
        <ModalBody className="space-y-4">
          {submitError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {submitError}
            </div>
          )}

          <FormControl isInvalid={!!formErrors.username}>
            <FormLabel>Username</FormLabel>
            <Input
              placeholder="Enter username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
            {formErrors.username && (
              <FormErrorMessage>{formErrors.username}</FormErrorMessage>
            )}
          </FormControl>

          <div className="grid grid-cols-2 gap-4">
            <FormControl isInvalid={!!formErrors.firstName}>
              <FormLabel>First Name</FormLabel>
              <Input
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
              {formErrors.firstName && (
                <FormErrorMessage>{formErrors.firstName}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!formErrors.lastName}>
              <FormLabel>Last Name</FormLabel>
              <Input
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
              {formErrors.lastName && (
                <FormErrorMessage>{formErrors.lastName}</FormErrorMessage>
              )}
            </FormControl>
          </div>

          <FormControl isInvalid={!!formErrors.email}>
            <FormLabel>Email (Optional)</FormLabel>
            <Input
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            {formErrors.email && (
              <FormErrorMessage>{formErrors.email}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isInvalid={!!formErrors.password}>
            <FormLabel>Password</FormLabel>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {formErrors.password && (
              <FormErrorMessage>{formErrors.password}</FormErrorMessage>
            )}
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="cta"
            onClick={handleAddUser}
            isLoading={isSubmitting}
          >
            Add Employee
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="md"
      >
        <ModalHeader showCloseButton onClose={() => setIsEditModalOpen(false)}>
          Edit Employee
        </ModalHeader>
        <ModalBody className="space-y-4">
          {submitError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {submitError}
            </div>
          )}

          <FormControl>
            <FormLabel>Username</FormLabel>
            <Input
              value={formData.username}
              disabled
              className="bg-neutral-100"
            />
            <p className="text-xs text-foreground-muted mt-1">Username cannot be changed</p>
          </FormControl>

          <div className="grid grid-cols-2 gap-4">
            <FormControl isInvalid={!!formErrors.firstName}>
              <FormLabel>First Name</FormLabel>
              <Input
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
              {formErrors.firstName && (
                <FormErrorMessage>{formErrors.firstName}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!formErrors.lastName}>
              <FormLabel>Last Name</FormLabel>
              <Input
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
              {formErrors.lastName && (
                <FormErrorMessage>{formErrors.lastName}</FormErrorMessage>
              )}
            </FormControl>
          </div>

          <FormControl isInvalid={!!formErrors.email}>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            {formErrors.email && (
              <FormErrorMessage>{formErrors.email}</FormErrorMessage>
            )}
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="cta"
            onClick={handleEditUser}
            isLoading={isSubmitting}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        size="sm"
      >
        <ModalHeader
          showCloseButton
          onClose={() => setIsDeleteModalOpen(false)}
        >
          Delete Employee
        </ModalHeader>
        <ModalBody>
          {submitError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm mb-4">
              {submitError}
            </div>
          )}
          <p className="text-foreground-secondary">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {selectedUser && getDisplayName(selectedUser)}
            </span>
            ? This action cannot be undone.
          </p>
          <p className="text-sm text-foreground-muted mt-2">
            Note: Employees with transaction history cannot be deleted. Consider deactivating instead.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteUser}
            isLoading={isSubmitting}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
