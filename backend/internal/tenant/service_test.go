package tenant

import "testing"

func TestNormalizeTenantBootstrapModeDefaultsToStarter(t *testing.T) {
	tests := map[string]string{
		"":              tenantBootstrapStarter,
		"starter":       tenantBootstrapStarter,
		"blank":         tenantBootstrapBlank,
		"template":      tenantBootstrapFull,
		"full":          tenantBootstrapFull,
		"full_template": tenantBootstrapFull,
		"unknown":       tenantBootstrapStarter,
	}

	for input, want := range tests {
		if got := normalizeTenantBootstrapMode(input); got != want {
			t.Fatalf("normalizeTenantBootstrapMode(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestReduceTenantTemplateByMode(t *testing.T) {
	tpl := tenantTemplateCatalog{
		Resources: []tenantTemplateResource{
			{Name: "Resource A"},
			{Name: "Resource B"},
		},
		MainItems: []tenantTemplateItem{
			{Name: "Main A"},
			{Name: "Main B"},
			{Name: "Main C"},
		},
		UnitAddons: []tenantTemplateItem{
			{Name: "Addon A"},
			{Name: "Addon B"},
		},
		FnbCatalog: []tenantTemplateFnbItem{
			{Name: "FnB A"},
			{Name: "FnB B"},
			{Name: "FnB C"},
		},
	}

	blank := reduceTenantTemplateByMode(tpl, tenantBootstrapBlank)
	if len(blank.Resources) != 0 || len(blank.MainItems) != 0 || len(blank.UnitAddons) != 0 || len(blank.FnbCatalog) != 0 {
		t.Fatalf("blank mode should return empty seed, got %#v", blank)
	}

	starter := reduceTenantTemplateByMode(tpl, tenantBootstrapStarter)
	if len(starter.Resources) != 1 {
		t.Fatalf("starter resources = %d, want 1", len(starter.Resources))
	}
	if len(starter.MainItems) != 2 {
		t.Fatalf("starter main items = %d, want 2", len(starter.MainItems))
	}
	if len(starter.UnitAddons) != 1 {
		t.Fatalf("starter addons = %d, want 1", len(starter.UnitAddons))
	}
	if len(starter.FnbCatalog) != 2 {
		t.Fatalf("starter fnb = %d, want 2", len(starter.FnbCatalog))
	}

	full := reduceTenantTemplateByMode(tpl, tenantBootstrapFull)
	if len(full.Resources) != 2 || len(full.MainItems) != 3 || len(full.UnitAddons) != 2 || len(full.FnbCatalog) != 3 {
		t.Fatalf("full mode should keep all items, got %#v", full)
	}
}
