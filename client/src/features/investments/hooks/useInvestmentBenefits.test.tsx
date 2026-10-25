import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import investmentBenefitsApi from "../api/investmentBenefits.api";
import {
  useCreateInvestmentBenefit,
  useDeleteInvestmentBenefit,
  useInvestmentBenefit,
  useInvestmentBenefits,
  useInvestmentBenefitsByInvestment,
  useQuickRealizeInvestmentBenefit,
  useRealizeInvestmentBenefit,
  useUpdateInvestmentBenefit,
} from "./useInvestmentBenefits";

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

afterEach(() => vi.restoreAllMocks());

describe("investment benefit hooks", () => {
  it("loads all, investment-scoped, and individual benefits", async () => {
    const getAll = vi.spyOn(investmentBenefitsApi, "getAll").mockResolvedValue([{ id: 1 }] as never);
    const getByInvestmentId = vi.spyOn(investmentBenefitsApi, "getByInvestmentId").mockResolvedValue([{ id: 2 }] as never);
    const getById = vi.spyOn(investmentBenefitsApi, "getById").mockResolvedValue({ id: 3 } as never);
    const queryClient = new QueryClient();
    const wrapper = createWrapper(queryClient);

    const all = renderHook(() => useInvestmentBenefits(), { wrapper });
    const byInvestment = renderHook(() => useInvestmentBenefitsByInvestment("7"), { wrapper });
    const benefit = renderHook(() => useInvestmentBenefit("7", "3"), { wrapper });

    await waitFor(() => expect(all.result.current.data).toEqual([{ id: 1 }]));
    await waitFor(() => expect(byInvestment.result.current.data).toEqual([{ id: 2 }]));
    await waitFor(() => expect(benefit.result.current.data).toEqual({ id: 3 }));
    expect(getAll).toHaveBeenCalledOnce();
    expect(getByInvestmentId).toHaveBeenCalledWith("7");
    expect(getById).toHaveBeenCalledWith("7", "3");
  });

  it("does not fetch scoped benefits when IDs are missing or disabled", async () => {
    const getByInvestmentId = vi.spyOn(investmentBenefitsApi, "getByInvestmentId");
    const getById = vi.spyOn(investmentBenefitsApi, "getById");
    const queryClient = new QueryClient();
    const wrapper = createWrapper(queryClient);

    renderHook(() => useInvestmentBenefitsByInvestment("", true), { wrapper });
    renderHook(() => useInvestmentBenefit("7", "", true), { wrapper });
    renderHook(() => useInvestmentBenefits(false), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getByInvestmentId).not.toHaveBeenCalled();
    expect(getById).not.toHaveBeenCalled();
  });

  it("calls benefit mutations with exact arguments and invalidates related investment queries", async () => {
    const create = vi.spyOn(investmentBenefitsApi, "create").mockResolvedValue({ id: 1 } as never);
    const update = vi.spyOn(investmentBenefitsApi, "update").mockResolvedValue({ id: 2 } as never);
    const remove = vi.spyOn(investmentBenefitsApi, "delete").mockResolvedValue(undefined);
    const realize = vi.spyOn(investmentBenefitsApi, "realize").mockResolvedValue({} as never);
    const quickRealize = vi.spyOn(investmentBenefitsApi, "quickRealize").mockResolvedValue({} as never);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createWrapper(queryClient);
    const createHook = renderHook(() => useCreateInvestmentBenefit(), { wrapper });
    const updateHook = renderHook(() => useUpdateInvestmentBenefit(), { wrapper });
    const deleteHook = renderHook(() => useDeleteInvestmentBenefit(), { wrapper });
    const realizeHook = renderHook(() => useRealizeInvestmentBenefit(), { wrapper });
    const quickRealizeHook = renderHook(() => useQuickRealizeInvestmentBenefit(), { wrapper });

    const payload = { benefitType: "INTEREST" as const, amount: 25, benefitDate: "2026-02-01" };
    await act(async () => {
      await createHook.result.current.mutateAsync({ investmentId: "7", payload });
      await updateHook.result.current.mutateAsync({ investmentId: "7", benefitId: "2", payload: { amount: 30 } });
      await deleteHook.result.current.mutateAsync({ investmentId: "7", benefitId: "2" });
      await realizeHook.result.current.mutateAsync({ investmentId: "7", benefitId: "2", payload: { components: [] } });
      await quickRealizeHook.result.current.mutateAsync({ investmentId: "7", payload: { ...payload, eventType: "INTEREST" } });
    });

    expect(create).toHaveBeenCalledWith("7", payload);
    expect(update).toHaveBeenCalledWith("7", "2", { amount: 30 });
    expect(remove).toHaveBeenCalledWith("7", "2");
    expect(realize).toHaveBeenCalledWith("7", "2", { components: [] });
    expect(quickRealize).toHaveBeenCalledWith("7", { ...payload, eventType: "INTEREST" });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["investment", "7"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["investment-benefits", "7"] });
  });
});