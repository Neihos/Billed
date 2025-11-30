/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js";
import mockStore from "../__mocks__/store.js";

import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    test("Then bills should be ordered from earliest to lastest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });

  describe("When I click on the new bill button", () => {
    test("Then it should navigate to NewBill page", () => {
      // GIVEN : on affiche BillsUI avec le bouton
      document.body.innerHTML = BillsUI({ data: [] });

      const onNavigate = jest.fn();
      // on instancie le container Bills pour brancher les listeners
      new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const newBillButton = screen.getByTestId("btn-new-bill");

      // WHEN : click sur le bouton
      fireEvent.click(newBillButton);

      // THEN : onNavigate appelé avec la bonne route
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
    });
  });

  describe("When I call getBills on the Bills container", () => {
    test("Then it should return the bills from the store with formatted date and status", async () => {
      // GIVEN
      const onNavigate = jest.fn();
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // WHEN
      const billsFormatted = await billsContainer.getBills();

      // THEN
      expect(billsFormatted.length).toBeGreaterThan(0);
      billsFormatted.forEach((bill) => {
        expect(bill.date).toBeTruthy();
        expect(bill.status).toBeTruthy();
      });
    });
  });
  
  describe("When I navigate to Bills Page", () => {
    test("Then it should fetch bills from mock API GET", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" })
      );

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();

      // WHEN
      window.onNavigate(ROUTES_PATH.Bills);

      // THEN
      await waitFor(() => screen.getByText("Mes notes de frais"));

      // on attend que la première bill mockée ("encore") soit rendue
      const firstBill = await waitFor(() => screen.getByText("encore"));
      expect(firstBill).toBeTruthy();
    });
  });

  describe("When I am on Bills Page and I click on the eye icon", () => {
    test("Then a modal with the bill image should be displayed", () => {
      // GIVEN : une page Bills avec une facture
      document.body.innerHTML = BillsUI({ data: [bills[0]] });

      const onNavigate = jest.fn();

      // On instancie le container pour brancher handleClickIconEye
      new Bills({
        document,
        onNavigate,
        store: null, // pas besoin d'appel API ici
        localStorage: window.localStorage,
      });

      // On mock la méthode .modal() de jQuery
      $.fn.modal = jest.fn();

      const eyeIcon = screen.getAllByTestId("icon-eye")[0];

      // WHEN : on clique sur l’icône œil
      fireEvent.click(eyeIcon);

      // THEN : la modale doit contenir une image
      const modalBody = document.querySelector("#modaleFile .modal-body");
      const img = modalBody.querySelector("img");

      expect(img).toBeTruthy();
      expect(img.getAttribute("src")).toBeTruthy(); // il y a bien un src non vide

      // Et la modale a été ouverte
      expect($.fn.modal).toHaveBeenCalledWith("show");
    });
  });

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
    });

    test("Then it should display an error message for 404 error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => Promise.reject(new Error("Erreur 404")),
        };
      });

      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("Then it should display an error message for 500 error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => Promise.reject(new Error("Erreur 500")),
        };
      });

      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
