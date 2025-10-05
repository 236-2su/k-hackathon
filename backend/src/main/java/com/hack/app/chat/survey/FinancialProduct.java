package com.hack.app.chat.survey;

import java.util.List;

public record FinancialProduct(
    String id,
    ProductType type,
    String name,
    String headline,
    List<String> benefits,
    String caution
) {
}