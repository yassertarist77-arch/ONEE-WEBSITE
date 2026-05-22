<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Decharge {{ $discharge->reference }}</title>
    <style>
        body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11px; color: #333; margin: 16px; line-height: 1.35; }
        .header { text-align: center; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid #1a365d; }
        .header h2 { font-size: 12px; color: #1a365d; margin: 0 0 4px 0; font-weight: bold; }
        .header h3 { font-size: 10px; color: #2c5282; margin: 2px 0; font-weight: normal; }
        .header h4 { font-size: 9px; color: #4a5568; margin: 4px 0 0 0; }
        .title { text-align: center; margin: 14px 0; padding: 10px; background: #f7fafc; border: 1px solid #1a365d; }
        .title h1 { font-size: 13px; color: #1a365d; margin: 0; font-weight: bold; text-transform: uppercase; }
        .refbox { text-align: center; margin: 12px 0; padding: 10px; background: #1a365d; color: #fff; }
        .refbox .lbl { font-size: 9px; text-transform: uppercase; margin-bottom: 3px; }
        .refbox .val { font-size: 15px; font-weight: bold; }
        .info { margin: 12px 0; padding: 10px; background: #f7fafc; border: 1px solid #e2e8f0; }
        .info table { width: 100%; border-collapse: collapse; }
        .info td { padding: 3px 0; vertical-align: top; }
        .info .k { width: 110px; font-weight: bold; color: #1a365d; }
        .items { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .items th { background: #1a365d; color: #fff; padding: 8px 6px; font-size: 9px; text-align: left; text-transform: uppercase; }
        .items td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
        .items .q { text-align: center; font-weight: bold; }
        .notes { margin: 12px 0; padding: 10px; background: #fffbeb; border: 1px solid #ecc94b; font-size: 10px; }
        .notes b { color: #744210; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8px; color: #718096; }
    </style>
</head>
<body>
@php
    $items = $items ?? [];
    $lineCount = count($items);
    $totalQty = collect($items)->sum(fn ($i) => (int) ($i['quantity'] ?? 0));
@endphp

    {{-- Pas de logos (ONEE / Maroc) — texte d’en-tête uniquement --}}
    <div class="header">
        <h2>ROYAUME DU MAROC</h2>
        <h3>Office National de l'Électricité et de l'Eau Potable</h3>
        <h3>Branche Eau</h3>
        <h4>Direction Régionale Béni Mellal Khénifra - Khouribga</h4>
    </div>

    <div class="title">
        <h1>Décharge de Remise de Consommables Informatiques</h1>
    </div>

    <div class="refbox">
        <div class="lbl">Référence de la Décharge</div>
        <div class="val">{{ $discharge->reference }}</div>
    </div>

    <div class="info">
        <table>
            <tr>
                <td class="k">Date :</td>
                <td>{{ $date }}</td>
            </tr>
            <tr>
                <td class="k">Bénéficiaire :</td>
                <td>{{ $discharge->recipient }}</td>
            </tr>
            @if($discharge->recipient_matricule)
            <tr>
                <td class="k">Matricule :</td>
                <td>{{ $discharge->recipient_matricule }}</td>
            </tr>
            @endif
            @if($discharge->entity)
            <tr>
                <td class="k">Entité :</td>
                <td>{{ $discharge->entity }}</td>
            </tr>
            @endif
            @if($discharge->ville)
            <tr>
                <td class="k">Ville :</td>
                <td>{{ $discharge->ville }}</td>
            </tr>
            @endif
        </table>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width:6%;">N°</th>
                <th style="width:44%;">Article</th>
                <th style="width:25%;">Référence</th>
                <th style="width:25%;">Quantité</th>
            </tr>
        </thead>
        <tbody>
        @foreach($items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item['name'] }}</td>
                <td>{{ $item['reference'] }}</td>
                <td class="q">{{ $item['quantity'] }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    {{-- Total discret (DomPDF lit bien les tableaux simples) --}}
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 6px 0 14px 0;">
        <tr>
            <td align="right" style="font-size: 8px; color: #555;">
                Nombre total d'articles (lignes) : <strong>{{ $lineCount }}</strong>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                Quantité totale : <strong>{{ $totalQty }}</strong>
            </td>
        </tr>
    </table>

    @if($discharge->notes)
    <div class="notes">
        <b>Notes / Commentaires :</b><br>{{ $discharge->notes }}
    </div>
    @endif

    {{-- Deux signatures côte à côte (largeurs explicites pour DomPDF) --}}
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
        <tr>
            <td width="48%" valign="bottom" align="center" style="padding-right: 8px;">
                <div style="border-top: 1px solid #333; margin-top: 44px; padding-top: 5px; font-size: 9px; font-weight: bold; color: #1a365d;">
                    Signature du Bénéficiaire
                </div>
            </td>
            <td width="4%"></td>
            <td width="48%" valign="bottom" align="center" style="padding-left: 8px;">
                <div style="border-top: 1px solid #333; margin-top: 44px; padding-top: 5px; font-size: 9px; font-weight: bold; color: #1a365d;">
                    Signature du Responsable
                </div>
            </td>
        </tr>
    </table>

    <div class="footer">
        Document généré le {{ $date }} — Système de Gestion des Consommables ONEE — Page 1/1
    </div>
</body>
</html>
