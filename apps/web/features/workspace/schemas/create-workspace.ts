export type CreateWorkspaceInput = {
  companyName: string;
};

export function validateCreateWorkspaceInput(input: CreateWorkspaceInput) {
  const companyName = input.companyName.trim().replace(/\s+/g, " ");

  if (!companyName) {
    return "Company name is required";
  }

  if (companyName.length < 2) {
    return "Company name must have at least 2 characters";
  }

  if (companyName.length > 80) {
    return "Company name must be 80 characters or less";
  }

  return null;
}
